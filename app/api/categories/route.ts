// app/api/categories/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import type { Category } from '@/types/budget'

const categorySchema = z.object({
  code: z.string().regex(/^F\d{4}$/, "Must be in format F#### (e.g., F0861)"),
  name: z.string().min(1, "Name is required"),
  parentId: z.string().nullable(),
  budgets: z.record(z.string(), z.number().min(0, "Budget must be positive")),
  color: z.string().optional(),
  isSpecialCategory: z.boolean().optional(),
  categoryType: z.string().optional()
})

type CategoryInput = z.infer<typeof categorySchema>

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        children: true,
        parent: true
      }
    })

    const formattedCategories = categories.map(category => ({
      ...category,
      budgets: category.budgets as Record<string, number>
    }))

    return NextResponse.json(formattedCategories)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch categories' }, 
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const validatedData = categorySchema.parse(data)
    
    const category = await prisma.category.create({
      data: {
        code: validatedData.code,
        name: validatedData.name,
        parentId: validatedData.parentId === 'none' ? null : validatedData.parentId,
        budgets: validatedData.budgets,
        color: validatedData.color,
        isLeaf: true, // New categories are leaf nodes by default
        isSpecialCategory: validatedData.isSpecialCategory || false,
        categoryType: validatedData.categoryType
      },
      include: {
        children: true,
        parent: true
      }
    })

    // If this category has a parent, update the parent's isLeaf status
    if (category.parentId) {
      await prisma.category.update({
        where: { id: category.parentId },
        data: { isLeaf: false }
      })
    }
    
    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors }, 
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create category' }, 
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    const validatedData = categorySchema.parse(data)

    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        code: validatedData.code,
        name: validatedData.name,
        parentId: validatedData.parentId === 'none' ? null : validatedData.parentId,
        budgets: validatedData.budgets,
        color: validatedData.color,
        isSpecialCategory: validatedData.isSpecialCategory,
        categoryType: validatedData.categoryType
      },
      include: {
        children: true,
        parent: true
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors }, 
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update category' }, 
      { status: 500 }
    )
  }
}