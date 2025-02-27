// app/api/categories/[id]/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const updateCategorySchema = z.object({
  code: z.string().regex(/^F\d{4}$/).optional(),
  name: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
  budgets: z.record(z.string(), z.number().min(0)).optional(),
  color: z.string().optional()
})

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const params = await context.params
    const data = await request.json()
    const validatedData = updateCategorySchema.parse(data)

    const category = await prisma.category.update({
      where: { id: params.id },
      data: validatedData
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Update category error:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}