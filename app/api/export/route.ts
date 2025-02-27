import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';
    const year = searchParams.get('year');
    
    const whereClause: any = {};
    if (year) {
      whereClause.year = parseInt(year);
    }
    
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: true,
        specialCategory: true
      }
    });

    if (format === 'json') {
      return NextResponse.json({ data: transactions });
    }
    
    // Default to CSV format
    const headers = [
      'id', 'projectCode', 'year', 'amount', 'internalCode',
      'description', 'costGroup', 'transactionType', 'documentNumber',
      'bookingDate', 'personReference', 'details', 'categoryCode'
    ];

    const csv = [
      headers.join(','),
      ...transactions.map(t => {
        const categoryCode = t.category?.code || t.specialCategory?.code || t.internalCode;
        
        return headers.map(h => {
          const value = h === 'categoryCode' 
            ? categoryCode 
            : h === 'bookingDate'
              ? t.bookingDate.toISOString().split('T')[0]
              : (t as any)[h];
          
          if (value instanceof Date) return value.toISOString().split('T')[0];
          if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
          return String(value ?? '');
        }).join(',');
      })
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=transactions-export.csv'
      }
    });
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}