import { createApiHandler } from '@/lib/api/api-handler';
import { TransactionUpdate } from '@/types/transaction';

export const PATCH = createApiHandler(async (req, context, prisma) => {
  const { id } = context.params;
  const data = await req.json() as TransactionUpdate;
  
  // Retrieve existing transaction
  const existingTransaction = await prisma.transaction.findUnique({
    where: { id }
  });
  
  if (!existingTransaction) {
    return {
      error: 'Transaction not found',
      data: null
    };
  }
  
  // Create log entry for the change
  if (data.previousState) {
    await prisma.transactionLog.create({
      data: {
        transactionId: id,
        action: 'transaction_updated',
        previousState: data.previousState || {},
        currentState: {
          categoryId: data.categoryId,
          specialCategoryId: data.specialCategoryId,
          status: data.status
        },
        note: `Transaction updated from status ${existingTransaction.status} to ${data.status}`,
        performedBy: 'user'
      }
    });
  }
  
  // Update the transaction
  const updatedTransaction = await prisma.transaction.update({
    where: { id },
    data: {
      status: data.status,
      categoryId: data.categoryId,
      specialCategoryId: data.specialCategoryId,
      metadata: data.metadata ? {
        ...existingTransaction.metadata as Record<string, any>,
        ...data.metadata
      } : undefined
    },
    include: {
      category: true,
      specialCategory: true
    }
  });
  
  return { data: updatedTransaction };
}, { allowedMethods: ['PATCH', 'PUT'] });

export const DELETE = createApiHandler(async (req, context, prisma) => {
  const { id } = context.params;
  
  // Check if transaction exists
  const transaction = await prisma.transaction.findUnique({
    where: { id }
  });
  
  if (!transaction) {
    return {
      error: 'Transaction not found',
      data: null
    };
  }
  
  // Delete related records first
  await prisma.transactionLog.deleteMany({
    where: { transactionId: id }
  });
  
  await prisma.transactionInquiry.deleteMany({
    where: { transactionId: id }
  });
  
  // Delete the transaction
  const deletedTransaction = await prisma.transaction.delete({
    where: { id }
  });
  
  return { data: deletedTransaction };
}, { allowedMethods: ['DELETE'] });