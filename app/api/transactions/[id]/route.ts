// app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params;
    const data = await request.json();
    
    // Retrieve existing transaction
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
      include: { category: true }
    });
    
    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Get current metadata
    const existingMetadata = existingTransaction.metadata as Record<string, unknown> || {};

    // Determine if this is a special category transaction
    const internalCode = existingTransaction.internalCode.replace(/^0+/, '');
    const isElvi = internalCode === '600';
    const isZuweisung = internalCode === '23152';
    const isSpecial = isElvi || isZuweisung;
    
    // Handle special category assignments
    let categoryId = data.categoryId;
    
    // For special categories, only allow category assignment under certain conditions
    if (isSpecial) {
      if (isElvi && data.status !== 'completed') {
        categoryId = null; // Keep ELVI transactions uncategorized until completed
      }
    }

    // Save metadata with previous state and additional fields if provided
    const metadata = {
      ...existingMetadata,
      previousState: data.previousState || {},
      categoryCode: data.categoryCode || existingMetadata.categoryCode,
      categoryName: data.categoryName || existingMetadata.categoryName,
      // Keep the fingerprint from existing metadata if available
      fingerprint: existingMetadata.fingerprint || null
    };

    // Update the transaction with provided fields
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        categoryId: categoryId, // This can be null
        status: data.status || existingTransaction.status,
        amount: data.amount !== undefined ? data.amount : undefined,
        description: data.description !== undefined ? data.description : undefined,
        personReference: data.personReference !== undefined ? data.personReference : undefined,
        details: data.details !== undefined ? data.details : undefined,
        documentNumber: data.documentNumber !== undefined ? data.documentNumber : undefined,
        requiresSpecialHandling: data.requiresSpecialHandling !== undefined ? data.requiresSpecialHandling : undefined,
        metadata: metadata
      },
      include: { category: true }
    });

    // Create a log entry for this change
    await prisma.transactionLog.create({
      data: {
        transactionId: id,
        action: data.categoryId ? 'category_assigned' : 'status_updated',
        previousState: data.previousState || {},
        currentState: {
          categoryId: data.categoryId,
          categoryCode: data.categoryCode,
          categoryName: data.categoryName,
          status: data.status
        },
        note: `${data.categoryId ? 'Category changed' : 'Status updated'} from ${data.previousState?.status || 'unknown'} to ${data.status || updatedTransaction.status}`,
        performedBy: 'user'
      }
    });

    // Format the response
    const responseData = {
      ...updatedTransaction,
      categoryCode: updatedTransaction.category?.code || metadata.categoryCode,
      categoryName: updatedTransaction.category?.name || metadata.categoryName
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}