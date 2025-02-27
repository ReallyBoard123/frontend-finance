//./app/api/transactions/batch/route.ts
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

interface BatchTransactionData {
  bookingDate: string | Date;
  invoiceDate?: string | Date | null;
  [key: string]: unknown;
}

export async function POST(req: Request) {
    try {
      const transactions = await req.json()
      
      const result = await prisma.$transaction(
        transactions.map((data: BatchTransactionData) => 
          prisma.transaction.create({
            data: {
              ...data,
              bookingDate: new Date(data.bookingDate),
              invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
              id: data.id as string,
              projectCode: data.projectCode as string,
              year: data.year as number,
              amount: data.amount as number,
              internalCode: data.internalCode as string,
              description: data.description as string,
              costGroup: data.costGroup as string,
              transactionType: data.transactionType as string,
            }
          })
        )
      )
      return NextResponse.json(result)
    } catch (_error) {
      console.error(_error);
      return NextResponse.json({ error: 'Failed to create transactions' }, { status: 500 })
    }
  }