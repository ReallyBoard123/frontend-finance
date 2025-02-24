// app/api/transactions/check/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await context.params;
    
    const id = requestId.includes('undefined') ? 
      `${requestId.split('-')[0]}-${requestId.split('-')[1]}-NO_DOC_${Date.now()}` :
      requestId;

    // Extract document number, handling NO_DOC cases
    const documentNumber = id.includes('NO_DOC') ? null : id.split('-')[2];
    
    // Build where clause for split detection
    const whereClause = documentNumber ? 
      { documentNumber, id: { not: id } } : 
      { 
        AND: [
          { projectCode: id.split('-')[0] },
          { year: parseInt(id.split('-')[1]) },
          { id: { not: id } }
        ]
      };

    const [mainTransaction, splitTransactions] = await Promise.all([
      prisma.transaction.findUnique({
        where: { id },
        include: { category: true }
      }),
      prisma.transaction.findMany({
        where: whereClause
      })
    ]);

    return NextResponse.json({
      found: !!mainTransaction,
      details: mainTransaction ? {
        id: mainTransaction.id,
        amount: mainTransaction.amount,
        bookingDate: mainTransaction.bookingDate,
        category: mainTransaction.category?.code,
        splits: splitTransactions.length,
        isSplit: splitTransactions.length > 0
      } : null
    });
  } catch (error) {
    console.error('Check failed:', error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}