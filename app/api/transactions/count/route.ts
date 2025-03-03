// app/api/transactions/count/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const count = await prisma.transaction.count();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error counting transactions:', error);
    return NextResponse.json(
      { error: 'Failed to count transactions', count: 0 }, 
      { status: 500 }
    );
  }
}