// app/api/transactions/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  
  try {
    const specialTypes = ['IVMC-Hochr.', 'ELVI']
    const where = type === 'special' ? 
      {
        OR: [
          { transactionType: { in: specialTypes } },
          { internalCode: '23152' }
        ]
      } : 
      {
        AND: [
          { transactionType: { notIn: specialTypes } },
          { internalCode: { not: '23152' } }
        ]
      }
 
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        inquiries: true
      },
      orderBy: { bookingDate: 'desc' }
    })
 
    const formattedTransactions = transactions.map(transaction => {
      // Format internal code to match F#### pattern
      const formattedCode = transaction.category?.code || 
        `F${transaction.internalCode.padStart(4, '0')}`;

      return {
        ...transaction,
        categoryCode: formattedCode,
        // Ensure dates are properly serialized
        bookingDate: transaction.bookingDate.toISOString(),
        invoiceDate: transaction.invoiceDate?.toISOString() || null,
        // Format amounts to prevent floating point issues
        amount: Number(transaction.amount.toFixed(2)),
      };
    });
 
    return NextResponse.json({
      transactions: formattedTransactions,
      count: transactions.length
    })
  } catch (error) {
    logger.error(`Error fetching transactions: ${error}`)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' }, 
      { status: 500 }
    )
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
      amount: data.amount
    })

    // Normalize data
    const documentNumber = data.documentNumber?.toString() || `NO_DOC_${Date.now()}`
    const year = Number(data.year)
    const bookingDate = new Date(data.bookingDate)
    const amount = Number(Number(data.amount).toFixed(2))
    const projectCode = data.projectCode?.toString()
    const internalCode = data.internalCode?.toString().padStart(4, '0')
    const categoryCode = data.categoryCode || `F${internalCode}`

    // Find category
    const category = await prisma.category.findUnique({
      where: { code: categoryCode }
    })

    if (!category && data.categoryCode) {
      logger.error(`Category not found: ${categoryCode}`)
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 400 }
      )
    }

    // Check for existing transaction
    const existing = await prisma.transaction.findFirst({
      where: {
        documentNumber,
        projectCode,
        year,
        bookingDate,
        internalCode,
        amount
      }
    })

    if (existing) {
      return NextResponse.json({
        message: 'Transaction already exists',
        transaction: existing
      })
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        id: `${projectCode}-${year}-${documentNumber}-${internalCode}`,
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
        categoryId: category?.id || (await getDefaultCategory()).id,
      },
      include: {
        category: true,
        inquiries: true
      }
    })

    return NextResponse.json({
      transaction: {
        ...transaction,
        categoryCode,
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
    if (data.categoryCode && !categoryId) {
      const category = await prisma.category.findUnique({
        where: { code: data.categoryCode }
      })
      if (category) {
        categoryId = category.id
      }
    }

    // Update transaction
    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        status: data.status,
        categoryId: categoryId || undefined,
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

    return NextResponse.json({
      transaction: {
        ...transaction,
        categoryCode: transaction.category?.code || 
          `F${transaction.internalCode.padStart(4, '0')}`,
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

// Helper function to get default category
async function getDefaultCategory() {
  const defaultCategory = await prisma.category.findFirst()
  if (!defaultCategory) {
    throw new Error('No default category found')
  }
  return defaultCategory
}