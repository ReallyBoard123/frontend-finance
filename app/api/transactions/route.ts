// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'regular';
    
    // Get all transactions
    const transactions = await prisma.transaction.findMany({
      include: {
        category: true
      },
      orderBy: {
        bookingDate: 'desc'
      }
    });
    
    // For debugging
    console.log(`Found ${transactions.length} total transactions`);
    
    // Map database model to frontend model
    const mappedTransactions = transactions.map(transaction => {
      // Get category data from the relationship or metadata
      const categoryData = transaction.category || { code: undefined, name: undefined };
      const metadata = transaction.metadata ? (transaction.metadata as Record<string, unknown>) : {};
      
      // More explicit special transactions filter
      const isSpecial = type === 'special' && (
        transaction.transactionType === 'IVMC-Hochr.' || 
        transaction.internalCode === '23152'
      );
      
      const isRegular = type === 'regular' && 
        transaction.transactionType !== 'IVMC-Hochr.' && 
        transaction.internalCode !== '23152';
      
      // Return the transaction if it matches the requested type
      if (isSpecial || isRegular) {
        return {
          id: transaction.id,
          projectCode: transaction.projectCode,
          year: transaction.year,
          amount: transaction.amount,
          internalCode: transaction.internalCode,
          description: transaction.description,
          costGroup: transaction.costGroup,
          transactionType: transaction.transactionType,
          documentNumber: transaction.documentNumber,
          bookingDate: transaction.bookingDate,
          personReference: transaction.personReference || null,
          details: transaction.details || null,
          invoiceDate: transaction.invoiceDate,
          invoiceNumber: transaction.invoiceNumber || null,
          paymentPartner: transaction.paymentPartner || null,
          internalAccount: transaction.internalAccount || null,
          accountLabel: transaction.accountLabel || null,
          categoryId: transaction.categoryId,
          // Use metadata for these fields if available or use raw data from internalCode
          categoryCode: metadata.categoryCode || categoryData.code || (transaction.internalCode ? `${transaction.internalCode}` : null),
          categoryName: metadata.categoryName || categoryData.name || null,
          status: transaction.status,
          requiresSpecialHandling: isSpecial
        };
      }
      return null;
    }).filter(Boolean);
    
    console.log(`Returning ${mappedTransactions.length} ${type} transactions`);
    
    return NextResponse.json({
      transactions: mappedTransactions,
      count: mappedTransactions.length
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Log incoming data
    logger.log({
      message: 'Processing new transaction',
      documentNumber: data.documentNumber,
      internalCode: data.internalCode,
      amount: data.amount,
      id: data.id
    })

    // Normalize data
    const documentNumber = data.documentNumber?.toString() || `NO_DOC_${Date.now()}`
    const year = Number(data.year)
    const bookingDate = new Date(data.bookingDate)
    const amount = Number(Number(data.amount).toFixed(2))
    const projectCode = data.projectCode?.toString()
    const internalCode = data.internalCode?.toString().padStart(4, '0')
    
    // Only try to find a category if we explicitly have a categoryCode that's not a raw numeric code
    let categoryId = null
    let category = null
    
    if (data.categoryCode && data.categoryCode.startsWith('F')) {
      // Try to find the category
      category = await prisma.category.findUnique({
        where: { code: data.categoryCode }
      })
      
      if (category) {
        categoryId = category.id
      } else if (data.categoryCode) {
        logger.error(`Category not found: ${data.categoryCode}`)
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 400 }
        )
      }
    }

    // Use the provided ID which should include the split index
    const transactionId = data.id || `${projectCode}-${year}-${documentNumber}-${Date.now()}`;

    // Check for existing transaction with this exact ID
    const existing = await prisma.transaction.findUnique({
      where: { id: transactionId }
    })

    if (existing) {
      return NextResponse.json({
        message: 'Transaction already exists',
        transaction: existing
      })
    }

    // Check if this is a numeric internal code that should be preserved
    const rawInternalCode = data.internalCode?.toString() || ''
    const isNumericInternalCode = /^\d+$/.test(rawInternalCode.replace(/^0+/, ''))
    const needsReview = isNumericInternalCode && !category
    
    // Handle split transaction metadata
    const isSplit = data.isSplit || false
    const totalSplits = data.totalSplits || 1
    const splitIndex = data.splitIndex || 0
    const originalAmount = data.originalAmount || amount
    
    // Create transaction - now categoryId can be null
    const transaction = await prisma.transaction.create({
      data: {
        id: transactionId,
        projectCode,
        year,
        amount,
        internalCode,
        description: data.description?.toString().trim(),
        costGroup: data.costGroup?.toString().trim(),
        transactionType: data.transactionType?.toString().trim(),
        documentNumber,
        bookingDate,
        personReference: data.personReference?.toString() || null,
        details: data.details?.toString() || null,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
        invoiceNumber: data.invoiceNumber?.toString() || null,
        paymentPartner: data.paymentPartner?.toString() || null,
        internalAccount: data.internalAccount?.toString() || null,
        accountLabel: data.accountLabel?.toString() || null,
        processed: false,
        status: data.status || 'unprocessed',
        categoryId, // This can now be null
        // Add split transaction fields
        isSplit,
        totalSplits,
        splitIndex,
        originalAmount: isSplit ? originalAmount : null,
        metadata: {
          originalInternalCode: data.internalCode,
          needsReview,
          categoryCode: category?.code,
          splitId: isSplit ? `${projectCode}-${year}-${documentNumber}` : null
        }
      },
      include: {
        category: true,
        inquiries: true
      }
    })

    // Generate the response - for numeric internal codes without categories, 
    // use the internal code directly as the categoryCode for display
    const displayCategoryCode = category?.code || (isNumericInternalCode ? internalCode : null)

    return NextResponse.json({
      transaction: {
        ...transaction,
        categoryCode: displayCategoryCode,
        bookingDate: transaction.bookingDate.toISOString(),
        invoiceDate: transaction.invoiceDate?.toISOString() || null,
        amount: Number(transaction.amount.toFixed(2))
      }
    })
  } catch (error) {
    logger.error(`Error creating transaction: ${error}`)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    
    // If categoryCode is provided, find the category
    let categoryId = data.categoryId
    if (data.categoryCode && !categoryId && data.categoryCode.startsWith('F')) {
      const category = await prisma.category.findUnique({
        where: { code: data.categoryCode }
      })
      if (category) {
        categoryId = category.id
      }
    }

    // Update transaction - categoryId can now be null
    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        status: data.status,
        categoryId: categoryId, // Can be undefined or null
        processed: data.processed,
        personReference: data.personReference,
        details: data.details,
        amount: data.amount ? Number(Number(data.amount).toFixed(2)) : undefined
      },
      include: {
        category: true,
        inquiries: true
      }
    })

    // For numeric internal codes without categories, use the internal code directly
    const displayCategoryCode = transaction.category?.code || transaction.internalCode

    return NextResponse.json({
      transaction: {
        ...transaction,
        categoryCode: displayCategoryCode,
        bookingDate: transaction.bookingDate.toISOString(),
        invoiceDate: transaction.invoiceDate?.toISOString() || null,
        amount: Number(transaction.amount.toFixed(2))
      }
    })
  } catch (error) {
    logger.error(`Error updating transaction: ${error}`)
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    )
  }
}