import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { transactions } = await request.json();
    
    // Get all existing transactions from the database
    const existingTransactions = await prisma.transaction.findMany();
    
    // Get all transaction inquiries
    const inquiries = await prisma.transactionInquiry.findMany({
      include: { transaction: true }
    });
    
    // Create lookup maps
    const existingMap = new Map();
    const inquiryMap = new Map();
    
    existingTransactions.forEach(t => {
      // Store by ID
      existingMap.set(t.id, t);
      
      // Store by date + reference + amount (for more reliable matching)
      if (t.bookingDate && t.personReference) {
        const dateStr = t.bookingDate.toISOString().split('T')[0];
        const key = `${dateStr}-${t.personReference}-${t.amount}`;
        existingMap.set(key, t);
      }
      
      // Store by document number + amount
      if (t.documentNumber) {
        const docKey = `${t.documentNumber}-${t.amount}`;
        existingMap.set(docKey, t);
      }
    });
    
    // Create lookup for inquiries
    inquiries.forEach(inq => {
      if (inq.transaction) {
        const t = inq.transaction;
        
        // Store by reference + amount
        if (t.personReference) {
          const refKey = `${t.personReference}-${t.amount}`;
          inquiryMap.set(refKey, { inquiry: inq, transaction: t });
        }
        
        // Store by date + amount
        if (t.bookingDate) {
          const dateStr = t.bookingDate.toISOString().split('T')[0];
          const dateKey = `${dateStr}-${t.amount}`;
          inquiryMap.set(dateKey, { inquiry: inq, transaction: t });
        }
      }
    });
    
    const newTransactions = [];
    const existingIds = [];
    const matchedInquiries = [];
    
    // Check each transaction
    for (const transaction of transactions) {
      let isExisting = false;
      
      // Check by ID
      if (existingMap.has(transaction.id)) {
        existingIds.push(transaction.id);
        isExisting = true;
      }
      
      // Check by date + reference + amount
      if (!isExisting && transaction.bookingDate && transaction.personReference) {
        const dateStr = new Date(transaction.bookingDate).toISOString().split('T')[0];
        const key = `${dateStr}-${transaction.personReference}-${transaction.amount}`;
        
        if (existingMap.has(key)) {
          existingIds.push(transaction.id);
          isExisting = true;
        }
      }
      
      // Check by document number + amount
      if (!isExisting && transaction.documentNumber) {
        const docKey = `${transaction.documentNumber}-${transaction.amount}`;
        
        if (existingMap.has(docKey)) {
          existingIds.push(transaction.id);
          isExisting = true;
        }
      }
      
      // Check against inquiries
      if (!isExisting) {
        // By reference + amount
        if (transaction.personReference) {
          const refKey = `${transaction.personReference}-${transaction.amount}`;
          if (inquiryMap.has(refKey)) {
            existingIds.push(transaction.id);
            isExisting = true;
            matchedInquiries.push({
              newId: transaction.id,
              inquiry: inquiryMap.get(refKey).inquiry,
              originalTransaction: inquiryMap.get(refKey).transaction
            });
          }
        }
        
        // By date + amount
        if (!isExisting && transaction.bookingDate) {
          const dateStr = new Date(transaction.bookingDate).toISOString().split('T')[0];
          const dateKey = `${dateStr}-${transaction.amount}`;
          
          if (inquiryMap.has(dateKey)) {
            existingIds.push(transaction.id);
            isExisting = true;
            matchedInquiries.push({
              newId: transaction.id,
              inquiry: inquiryMap.get(dateKey).inquiry,
              originalTransaction: inquiryMap.get(dateKey).transaction
            });
          }
        }
      }
      
      // If still not matched, it's a new transaction
      if (!isExisting) {
        newTransactions.push(transaction);
      }
    }
    
    return NextResponse.json({ 
      existingIds, 
      newTransactions,
      matchedInquiries,
      newCount: newTransactions.length,
      totalCount: transactions.length
    });
  } catch (error) {
    console.error('Error checking transactions:', error);
    return NextResponse.json({ error: 'Failed to check transactions' }, { status: 500 });
  }
}