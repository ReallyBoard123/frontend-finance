// app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // FIX: Make sure to await params - this was causing the error
    const { id } = await params;
    const data = await request.json();
    
    // Retrieve existing transaction
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id }
    });
    
    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Check for special numeric codes that should have null categoryId
    let categoryId = data.categoryId;
    const categoryCode = data.categoryCode;
    
    // Normalize internal code and check if it's a special category
    const internalCode = existingTransaction.internalCode.replace(/^0+/, '');
    const isSpecialCategory = internalCode === '600' || internalCode === '23152';
    
    // For special categories, only allow category assignment if explicitly changing status to completed
    if (isSpecialCategory) {
      if (data.status !== 'completed') {
        categoryId = null;
      }
    }

    // Save metadata with previous state and additional fields if provided
    const metadata = {
      ...(existingTransaction.metadata as Record<string, unknown> || {}),
      previousState: data.previousState || {},
      categoryCode: data.categoryCode,
      categoryName: data.categoryName,
      // Special handling for ELVI transactions (600)
      needsReview: internalCode === '600' && data.status !== 'completed'
    };

    // Update the transaction with fields that exist in the Prisma schema
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        categoryId: categoryId, // This can be null
        status: data.status || existingTransaction.status,
        metadata: metadata
      }
    });

    // Create a log entry for this change
    if ((data.categoryId !== existingTransaction.categoryId) || 
        (data.categoryCode && (existingTransaction.metadata as Record<string, unknown>)?.categoryCode !== data.categoryCode)) {
      await prisma.transactionLog.create({
        data: {
          transactionId: id,
          action: 'category_assigned',
          previousState: data.previousState || {},
          currentState: {
            categoryId: data.categoryId,
            categoryCode: data.categoryCode,
            categoryName: data.categoryName
          },
          note: `Category changed from ${(existingTransaction.metadata as Record<string, unknown>)?.categoryCode || 'unassigned'} to ${data.categoryCode}`,
          performedBy: 'user'
        }
      });
    }

    // Return the display categoryCode based on transaction type
    const displayCategoryCode = isSpecialCategory ? 
      (internalCode === '600' ? '600' : '23152') : 
      (data.categoryCode || existingTransaction.internalCode);

    return NextResponse.json({
      ...updatedTransaction,
      categoryCode: displayCategoryCode,
      categoryName: data.categoryName
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}