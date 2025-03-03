// app/api/transactions/check-fingerprint/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { fingerprint, id } = await request.json();
    
    if (!fingerprint) {
      return NextResponse.json(
        { error: 'Fingerprint is required' }, 
        { status: 400 }
      );
    }

    // Find transaction by fingerprint in metadata
    const transaction = await prisma.transaction.findFirst({
      where: {
        metadata: {
          path: ['fingerprint'],
          equals: fingerprint
        }
      },
      include: { 
        category: true 
      }
    });

    if (!transaction) {
      return NextResponse.json({
        found: false,
        details: null
      });
    }

    const metadata = transaction.metadata as Record<string, unknown> || {};
    
    return NextResponse.json({
      found: true,
      details: {
        id: transaction.id,
        amount: transaction.amount,
        bookingDate: transaction.bookingDate,
        description: transaction.description,
        internalCode: transaction.internalCode,
        categoryId: transaction.categoryId,
        categoryCode: transaction.category?.code || metadata.categoryCode as string || transaction.internalCode,
        status: transaction.status,
        documentNumber: transaction.documentNumber,
        personReference: transaction.personReference,
        details: transaction.details,
        requiresSpecialHandling: transaction.requiresSpecialHandling,
        isSplit: transaction.isSplit,
        fingerprint: metadata.fingerprint
      }
    });
  } catch (error) {
    console.error('Check by fingerprint failed:', error);
    return NextResponse.json(
      { error: 'Check by fingerprint failed' }, 
      { status: 500 }
    );
  }
}