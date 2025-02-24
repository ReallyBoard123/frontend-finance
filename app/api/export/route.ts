// app/api/export/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        category: true,
        inquiries: true
      }
    });

    const headers = [
      'id', 'projectCode', 'year', 'amount', 'internalCode',
      'description', 'costGroup', 'transactionType', 'documentNumber',
      'bookingDate', 'personReference', 'details', 'categoryCode'
    ];

    const csv = [
      headers.join(','),
      ...transactions.map(t => headers.map(h => {
        const value = h === 'categoryCode' ? t.category?.code : t[h as keyof typeof t];
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return String(value ?? '');
      }).join(','))
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