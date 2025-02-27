import { createApiHandler } from '@/lib/api/api-handler';
import { InquiryUpdate } from '@/types/inquiry';

export const PATCH = createApiHandler(async (req, context, prisma) => {
  const { id } = context.params;
  const data = await req.json() as InquiryUpdate;
  
  if (!data.status) {
    return {
      error: 'status is required',
      data: null
    };
  }
  
  // Get the inquiry with transaction
  const inquiry = await prisma.transactionInquiry.findUnique({
    where: { id },
    include: { transaction: true }
  });
  
  if (!inquiry) {
    return {
      error: 'Inquiry not found',
      data: null
    };
  }
  
  // Update the inquiry
  const updatedInquiry = await prisma.transactionInquiry.update({
    where: { id },
    data: { 
      status: data.status,
      updatedAt: new Date()
    },
    include: {
      transaction: true
    }
  });
  
  // Update the transaction status based on the inquiry resolution
  const newTransactionStatus = data.status === 'resolved' ? 'completed' : 'unprocessed';
  await prisma.transaction.update({
    where: { id: updatedInquiry.transactionId },
    data: { status: newTransactionStatus }
  });
  
  // Log the status change
  await prisma.transactionLog.create({
    data: {
      transactionId: updatedInquiry.transactionId,
      action: 'inquiry_resolved',
      previousState: { 
        inquiryStatus: inquiry.status,
        transactionStatus: inquiry.transaction.status
      },
      currentState: { 
        inquiryStatus: data.status,
        transactionStatus: newTransactionStatus
      },
      note: `Inquiry ${data.status}${data.note ? `: ${data.note}` : ''}`,
      performedBy: 'user'
    }
  });
  
  return { data: updatedInquiry };
}, { allowedMethods: ['PATCH', 'PUT'] });