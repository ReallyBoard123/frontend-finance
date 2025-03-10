// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    
    // Get all transactions and categories in one query
    const [transactions, categories] = await Promise.all([
      prisma.transaction.findMany({
        include: { category: true },
        orderBy: { bookingDate: 'desc' }
      }),
      prisma.category.findMany()
    ]);
    
    // Create a map of parent categories
    const parentCategoryIds = new Set();
    categories.forEach(category => {
      if (categories.some(c => c.parentId === category.id)) {
        parentCategoryIds.add(category.id);
      }
    });
    
    console.log(`Found ${transactions.length} total transactions`);
    
    // Map and categorize all transactions upfront
    const allTransactions = transactions.map(transaction => {
      const categoryData = transaction.category || { code: undefined, name: undefined };
      const metadata = transaction.metadata ? (transaction.metadata as Record<string, unknown>) : {};
      const isParentCategory = transaction.category && parentCategoryIds.has(transaction.category.id);
      
      // Determine if this is a special transaction
      const isSpecial = 
        transaction.transactionType === 'IVMC-Hochr.' || 
        transaction.internalCode.replace(/^0+/, '') === '23152';
      
      // Determine transaction type
      let transactionType = 'regular';
      if (isSpecial) {
        transactionType = 'special';
      } else if (isParentCategory || !transaction.categoryId) {
        transactionType = 'missing';
      }
      
      // Determine proper status
      let status = transaction.status || 'unprocessed';
      if (isSpecial) {
        status = 'special';
      } else if (isParentCategory || !transaction.categoryId) {
        status = 'missing';
      } else if (transaction.categoryId && !isParentCategory) {
        status = 'processed';
      }
      
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
        categoryCode: metadata.categoryCode || categoryData.code || null,
        categoryName: metadata.categoryName || categoryData.name || null,
        status,
        requiresSpecialHandling: isSpecial,
        _transactionType: transactionType  // Special property to categorize the transaction
      };
    });
    
    // Group transactions by their type
    const regularTransactions = allTransactions.filter(t => t._transactionType === 'regular');
    const specialTransactions = allTransactions.filter(t => t._transactionType === 'special');
    const missingTransactions = allTransactions.filter(t => t._transactionType === 'missing');
    
    // If a specific type was requested, return only that type
    let responseTransactions;
    if (type === 'special') {
      responseTransactions = specialTransactions;
    } else if (type === 'missing') {
      responseTransactions = missingTransactions;
    } else if (type === 'regular') {
      responseTransactions = regularTransactions;
    } else {
      // If no type specified, return everything in separate arrays
      // This way the frontend doesn't have to categorize anything
      return NextResponse.json({
        allTransactions,
        regularTransactions,
        specialTransactions,
        missingTransactions,
        counts: {
          all: allTransactions.length,
          regular: regularTransactions.length,
          special: specialTransactions.length,
          missing: missingTransactions.length
        }
      });
    }
    
    console.log(`Transactions by type: ${regularTransactions.length} regular, ${specialTransactions.length} special, ${missingTransactions.length} missing`);
    console.log(`Returning ${responseTransactions.length} ${type || 'all'} transactions`);
    
    return NextResponse.json({
      transactions: responseTransactions,
      count: responseTransactions.length,
      counts: {
        all: allTransactions.length,
        regular: regularTransactions.length,
        special: specialTransactions.length,
        missing: missingTransactions.length
      }
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
    
    // Check for special transaction types
    const normalizedInternalCode = data.internalCode?.toString().replace(/^0+/, '') || '';
    const isSpecialTransaction = 
      data.transactionType === 'IVMC-Hochr.' || 
      normalizedInternalCode === '23152';
    
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
        
        // Check if this is a parent category
        const hasChildren = await prisma.category.findFirst({
          where: { parentId: category.id }
        });
        
        // If it's a parent category, it should be marked as missing
        if (hasChildren) {
          data.status = 'missing';
        }
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
    
    // Determine initial status based on transaction type and category
    let initialStatus = data.status || 'unprocessed';
    
    if (isSpecialTransaction) {
      // Special transaction types should always be marked as special
      initialStatus = 'special';
    } else if (categoryId) {
      // Check if this is a parent category (needs missing status)
      const hasChildren = await prisma.category.findFirst({
        where: { parentId: categoryId }
      });
      
      if (hasChildren) {
        initialStatus = 'missing';
      } else {
        initialStatus = 'processed';
      }
    } else {
      // No category means it needs processing
      initialStatus = 'missing';
    }
    
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
        processed: initialStatus === 'processed',
        status: initialStatus,
        categoryId, // This can now be null
        requiresSpecialHandling: isSpecialTransaction,
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
        amount: Number(transaction.amount.toFixed(2)),
        requiresSpecialHandling: isSpecialTransaction
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