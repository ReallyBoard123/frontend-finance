import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
  ) {
    try {
      const { spent, ...data } = await req.json()
      const budget = await prisma.categoryBudget.update({
        where: { id: params.id },
        data: {
          ...data,
          spent: spent || 0,
          remaining: data.amount - (spent || 0)
        }
      })
      return NextResponse.json(budget)
    } catch (error) {
      return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 })
    }
  }