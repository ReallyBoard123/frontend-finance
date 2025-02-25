// app/api/transaction-inquiries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const data = await request.json()
    
    if (!data.status) {
      return NextResponse.json(
        { error: 'status is required' }, 
        { status: 400 }
      )
    }

    // Update the inquiry
    const updatedInquiry = await prisma.transactionInquiry.update({
      where: { id },
      data: { 
        status: data.status,
        updatedAt: new Date()
      },
      include: {
        transaction: true
      }
    })

    // Update the transaction status based on the inquiry resolution
    await prisma.transaction.update({
      where: { id: updatedInquiry.transactionId },
      data: { 
        status: data.status === 'resolved' ? 'completed' : 'unprocessed'
      }
    })

    return NextResponse.json(updatedInquiry)
  } catch (error) {
    console.error('Error updating inquiry:', error)
    return NextResponse.json({ error: 'Failed to update inquiry' }, { status: 500 })
  }
}