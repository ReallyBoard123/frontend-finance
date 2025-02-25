// app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
    
    if (categoryCode && /^0*(600|23152)$/.test(categoryCode)) {
      // For special codes, set categoryId to null but preserve the code in metadata
      categoryId = null;
    }

    // Save metadata with previous state and additional fields if provided
    const metadata = {
      ...(existingTransaction.metadata as any || {}),
      previousState: data.previousState || {},
      categoryCode: data.categoryCode,
      categoryName: data.categoryName,
      // For special codes, explicitly mark as not needing review if status is completed
      needsReview: categoryId === null && data.status !== 'completed'
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
        (data.categoryCode && (existingTransaction.metadata as any)?.categoryCode !== data.categoryCode)) {
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
          note: `Category changed from ${(existingTransaction.metadata as any)?.categoryCode || 'unassigned'} to ${data.categoryCode}`,
          performedBy: 'user'
        }
      });
    }

    // Return the display categoryCode based on whether it's a special numeric code
    const displayCategoryCode = categoryId === null ? 
      (categoryCode || existingTransaction.internalCode) : 
      data.categoryCode;

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