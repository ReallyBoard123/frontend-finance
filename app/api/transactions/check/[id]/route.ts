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

    // For backward compatibility - this endpoint now redirects to the fingerprint-based check
    // Get transaction details including fingerprint
    if (mainTransaction) {
      const metadata = mainTransaction.metadata as any || {};
      
      return NextResponse.json({
        found: true,
        details: {
          id: mainTransaction.id,
          amount: mainTransaction.amount,
          bookingDate: mainTransaction.bookingDate,
          description: mainTransaction.description,
          internalCode: mainTransaction.internalCode,
          categoryId: mainTransaction.categoryId,
          categoryCode: mainTransaction.category?.code || 
            metadata.categoryCode || 
            mainTransaction.internalCode,
          status: mainTransaction.status,
          documentNumber: mainTransaction.documentNumber,
          personReference: mainTransaction.personReference,
          details: mainTransaction.details,
          requiresSpecialHandling: mainTransaction.requiresSpecialHandling,
          splits: splitTransactions.length,
          isSplit: mainTransaction.isSplit || splitTransactions.length > 0,
          fingerprint: metadata.fingerprint
        }
      });
    }

    return NextResponse.json({
      found: false,
      details: null
    });
  } catch (error) {
    console.error('Check failed:', error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}