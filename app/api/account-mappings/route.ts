import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
      const data = await req.json()
      const mapping = await prisma.accountMapping.create({ data })
      return NextResponse.json(mapping)
    } catch (error) {
      return NextResponse.json({ error: 'Failed to create mapping' }, { status: 500 })
    }
  }
  
  export async function GET(req: Request) {
    try {
      const mappings = await prisma.accountMapping.findMany({
        where: { active: true },
        include: {
          category: true
        }
      })
      return NextResponse.json(mappings)
    } catch (error) {
      return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 })
    }
  }