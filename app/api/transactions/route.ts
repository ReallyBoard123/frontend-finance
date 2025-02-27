import { createApiHandler } from '@/lib/api/api-handler';
import { FilterParams, SortParams } from '@/types/common';
import { TransactionBase } from '@/types/transaction';
import { NextRequest } from 'next/server';

function generateTransactionId(transaction: TransactionBase): string {
  const docNumber = transaction.documentNumber || `NO_DOC_${Date.now()}`;
  return `${transaction.projectCode}-${transaction.year}-${docNumber}`;
}

function parseFilterParams(req: NextRequest): FilterParams {
  const searchParams = req.nextUrl.searchParams;
  
  return {
    type: searchParams.get('type') || undefined,
    year: searchParams.get('year') || undefined,
    status: (searchParams.get('status') as any) || undefined,
    categoryCode: searchParams.get('categoryCode') || undefined,
    search: searchParams.get('search') || undefined
  };
}

function parseSortParams(req: NextRequest): SortParams | undefined {
  const field = req.nextUrl.searchParams.get('sortBy');
  const direction = req.nextUrl.searchParams.get('sortDir') as 'asc' | 'desc';
  
  if (field && (direction === 'asc' || direction === 'desc')) {
    return { field, direction };
  }
  
  return undefined;
}

export const GET = createApiHandler(async (req, context, prisma) => {
  const filters = parseFilterParams(req);
  const sort = parseSortParams(req);
  
  // Build the where clause
  const where: any = {};
  
  if (filters.type === 'special') {
    where.specialCategoryId = { not: null };
  } else if (filters.type === 'regular') {
    where.specialCategoryId = null;
  }
  
  if (filters.year) {
    where.year = Number(filters.year);
  }
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.categoryCode) {
    const category = await prisma.category.findUnique({
      where: { code: filters.categoryCode }
    });
    if (category) {
      where.categoryId = category.id;
    }
  }
  
  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: 'insensitive' } },
      { details: { contains: filters.search, mode: 'insensitive' } },
      { personReference: { contains: filters.search, mode: 'insensitive' } },
      { documentNumber: { contains: filters.search, mode: 'insensitive' } }
    ];
  }
  
  // Build the orderBy
  const orderBy: any = {};
  if (sort) {
    orderBy[sort.field] = sort.direction;
  } else {
    orderBy.bookingDate = 'desc';
  }
  
  // Get transactions
  const [transactions, count] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        category: true,
        specialCategory: true
      },
      orderBy
    }),
    prisma.transaction.count({ where })
  ]);
  
  // Map to response format
  const mappedTransactions = transactions.map(tx => {
    const categoryCode = tx.category?.code || 
      (tx.specialCategory?.code || tx.internalCode);
      
    return {
      ...tx,
      categoryCode,
      categoryName: tx.category?.name || tx.specialCategory?.name,
      bookingDate: tx.bookingDate.toISOString(),
      invoiceDate: tx.invoiceDate?.toISOString() || null
    };
  });
  
  return {
    data: mappedTransactions,
    count
  };
}, { allowedMethods: ['GET'] });

export const POST = createApiHandler(async (req, context, prisma) => {
  const data = await req.json() as TransactionBase;
  
  // Check for existing transaction
  const id = generateTransactionId(data);
  const existing = await prisma.transaction.findUnique({
    where: { id }
  });
  
  if (existing) {
    return {
      message: 'Transaction already exists',
      data: existing
    };
  }
  
  // Check if this matches a special category
  let specialCategoryId = null;
  const specialCategory = await prisma.specialCategory.findUnique({
    where: { code: data.internalCode }
  });
  
  if (specialCategory) {
    specialCategoryId = specialCategory.id;
  }
  
  // Check for category mapping
  let categoryId = null;
  if (!specialCategoryId && data.internalCode) {
    // Try to find mapping
    const mapping = await prisma.accountMapping.findUnique({
      where: { internalCode: data.internalCode }
    });
    
    if (mapping) {
      categoryId = mapping.categoryId;
    }
  }
  
  // Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      id,
      projectCode: data.projectCode,
      year: data.year,
      amount: data.amount,
      internalCode: data.internalCode,
      description: data.description,
      costGroup: data.costGroup || '',
      transactionType: data.transactionType,
      documentNumber: data.documentNumber || null,
      bookingDate: new Date(data.bookingDate),
      personReference: data.personReference || null,
      details: data.details || null,
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
      invoiceNumber: data.invoiceNumber || null,
      paymentPartner: data.paymentPartner || null,
      internalAccount: data.internalAccount || null,
      accountLabel: data.accountLabel || null,
      processed: false,
      status: data.status || 'unprocessed',
      categoryId,
      specialCategoryId,
      metadata: data.metadata || {}
    },
    include: {
      category: true,
      specialCategory: true
    }
  });
  
  return { data: transaction };
}, { allowedMethods: ['POST'] });