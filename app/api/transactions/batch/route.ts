import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
      const transactions = await req.json()
      
      const result = await prisma.$transaction(
        transactions.map((data: any) => 
          prisma.transaction.create({
            data: {
              ...data,
              bookingDate: new Date(data.bookingDate),
              invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null
            }
          })
        )
      )
      return NextResponse.json(result)
    } catch (error) {
      return NextResponse.json({ error: 'Failed to create transactions' }, { status: 500 })
    }
  }