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
      const metadata = transaction.metadata ? (transaction.metadata as Record<string, unknown>) : {};
      const categoryData = transaction.category || { code: undefined, name: undefined };
      
      // More explicit special transactions filter
      const isSpecial = type === 'special' && (
        transaction.transactionType === 'IVMC-Hochr.' || 
        transaction.internalCode === '23152' ||
        transaction.internalCode === '023152'
      );
      
      const isRegular = type === 'regular' && 
        transaction.transactionType !== 'IVMC-Hochr.' && 
        transaction.internalCode !== '23152' &&
        transaction.internalCode !== '023152';
      
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
          requiresSpecialHandling: isSpecial,
          metadata: metadata
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
    const data = await request.json();
    
    // Log incoming data
    logger.log({
      message: 'Processing new transaction',
      documentNumber: data.documentNumber,
      internalCode: data.internalCode,
      amount: data.amount,
      id: data.id,
      fingerprint: data.metadata?.fingerprint
    });

    // Normalize data
    const documentNumber = data.documentNumber?.toString() || `NO_DOC_${Date.now()}`;
    const year = Number(data.year);
    const bookingDate = new Date(data.bookingDate);
    const amount = Number(Number(data.amount).toFixed(2));
    const projectCode = data.projectCode?.toString();
    const internalCode = data.internalCode?.toString().padStart(4, '0');
    
    // First check if this transaction already exists by fingerprint
    // to prevent duplicates even if ID is different
    if (data.metadata?.fingerprint) {
      const existingByFingerprint = await prisma.transaction.findFirst({
        where: {
          metadata: {
            path: ['fingerprint'],
            equals: data.metadata.fingerprint
          }
        }
      });
      
      if (existingByFingerprint) {
        logger.log(`Duplicate transaction detected with fingerprint: ${data.metadata.fingerprint}`);
        return NextResponse.json({
          message: 'Transaction already exists (by fingerprint)',
          transaction: existingByFingerprint
        });
      }
    }
    
    // Check for existing transaction with this exact ID
    const existing = await prisma.transaction.findUnique({
      where: { id: data.id }
    });

    if (existing) {
      return NextResponse.json({
        message: 'Transaction already exists (by ID)',
        transaction: existing
      });
    }

    // Check if this is a special category
    const normalizedInternalCode = internalCode.replace(/^0+/, '');
    const is600 = normalizedInternalCode === '600';
    const is23152 = normalizedInternalCode === '23152';
    
    // Only try to find a category if we explicitly have a categoryCode that's not a special code
    let categoryId = null;
    let category = null;
    
    if (data.categoryCode && data.categoryCode.startsWith('F') && !is600 && !is23152) {
      // Try to find the category
      category = await prisma.category.findUnique({
        where: { code: data.categoryCode }
      });
      
      if (category) {
        categoryId = category.id;
      } else if (data.categoryCode) {
        logger.error(`Category not found: ${data.categoryCode}`);
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 400 }
        );
      }
    }
    
    // Handle split transaction metadata
    const isSplit = data.isSplit || false;
    const totalSplits = data.totalSplits || 1;
    const splitIndex = data.splitIndex || 0;
    const originalAmount = data.originalAmount || amount;
    
    // Create transaction - categoryId can be null
    const transaction = await prisma.transaction.create({
      data: {
        id: data.id,
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
        categoryId, // This can be null
        // Add split transaction fields
        isSplit,
        totalSplits,
        splitIndex,
        originalAmount: isSplit ? originalAmount : null,
        metadata: {
          originalInternalCode: data.internalCode,
          needsReview: is600,
          categoryCode: category?.code || data.categoryCode,
          splitId: isSplit ? `${projectCode}-${year}-${documentNumber}` : null,
          fingerprint: data.metadata?.fingerprint // Store the fingerprint for future matching
        }
      },
      include: {
        category: true
      }
    });

    // Generate the response
    const displayCategoryCode = category?.code || (data.categoryCode && data.categoryCode.startsWith('F')) ? 
      data.categoryCode : (is600 || is23152) ? internalCode : null;

    return NextResponse.json({
      transaction: {
        ...transaction,
        categoryCode: displayCategoryCode,
        bookingDate: transaction.bookingDate.toISOString(),
        invoiceDate: transaction.invoiceDate?.toISOString() || null,
        amount: Number(transaction.amount.toFixed(2))
      }
    });
  } catch (error) {
    logger.error(`Error creating transaction: ${error}`);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}