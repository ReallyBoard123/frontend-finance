// app/api/transaction-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.transactionId || !data.action) {
      return NextResponse.json(
        { error: 'transactionId and action are required' }, 
        { status: 400 }
      );
    }

    // Create transaction log entry
    const log = await prisma.transactionLog.create({
      data: {
        transactionId: data.transactionId,
        action: data.action,
        previousState: data.previousState || {},
        currentState: data.currentState || {},
        note: data.note || '',
        performedBy: data.performedBy || 'system'
      }
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error('Error creating transaction log:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction log' }, 
      { status: 500 }
    );
  }
}