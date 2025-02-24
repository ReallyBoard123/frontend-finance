// app/api/transaction-inquiries/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const inquiries = await prisma.transactionInquiry.findMany({
      include: {
        transaction: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(inquiries)
  } catch (error) {
    console.error('Error fetching inquiries:', error)
    return NextResponse.json({ error: 'Failed to fetch inquiries' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    if (!data.transactionId || !data.note) {
      return NextResponse.json(
        { error: 'transactionId and note are required' }, 
        { status: 400 }
      )
    }

    const inquiry = await prisma.transactionInquiry.create({
      data: {
        transactionId: data.transactionId,
        note: data.note,
        status: 'pending'
      },
      include: {
        transaction: true
      }
    })

    // Update transaction status
    await prisma.transaction.update({
      where: { id: data.transactionId },
      data: { status: 'pending_inquiry' }
    })

    return NextResponse.json(inquiry)
  } catch (error) {
    console.error('Error creating inquiry:', error)
    return NextResponse.json({ error: 'Failed to create inquiry' }, { status: 500 })
  }
}