// app/api/transactions/[id]/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['pending', 'completed', 'unprocessed', 'pending_inquiry']).optional(),
  categoryId: z.string().optional(),
  processed: z.boolean().optional(),
  personReference: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  amount: z.number().optional()
})

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    const validatedData = updateSchema.parse(data)

    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        amount: validatedData.amount ? Number(validatedData.amount.toFixed(2)) : undefined
      },
      include: {
        category: true,
        inquiries: true
      }
    })

    return NextResponse.json({
      transaction: {
        ...transaction,
        categoryCode: transaction.category?.code || 
          `F${transaction.internalCode.padStart(4, '0')}`,
        bookingDate: transaction.bookingDate.toISOString(),
        invoiceDate: transaction.invoiceDate?.toISOString() || null,
        amount: Number(transaction.amount.toFixed(2))
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
} 