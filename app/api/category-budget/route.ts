import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
      const data = await req.json()
      const budget = await prisma.categoryBudget.create({ data })
      return NextResponse.json(budget)
    } catch (error) {
      return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
    }
  }
  
  export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year')
  
    try {
      const where: any = {}
      if (year) where.year = parseInt(year)
  
      const budgets = await prisma.categoryBudget.findMany({
        where,
        include: {
          category: true
        }
      })
      return NextResponse.json(budgets)
    } catch (error) {
      return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
    }
  }
  