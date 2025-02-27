import { createApiHandler } from '@/lib/api/api-handler';
import { InquiryFormData } from '@/types/inquiry';

export const GET = createApiHandler(async (req, context, prisma) => {
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status');
  
  const where = status ? { status } : {};
  
  const inquiries = await prisma.transactionInquiry.findMany({
    where,
    include: {
      transaction: {
        include: {
          category: true,
          specialCategory: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  return { data: inquiries };
}, { allowedMethods: ['GET'] });

export const POST = createApiHandler(async (req, context, prisma) => {
  const data = await req.json() as InquiryFormData;
  
  if (!data.transactionId || !data.note) {
    return {
      error: 'transactionId and note are required',
      data: null
    };
  }
  
  // Check if transaction exists
  const transaction = await prisma.transaction.findUnique({
    where: { id: data.transactionId }
  });
  
  if (!transaction) {
    return {
      error: 'Transaction not found',
      data: null
    };
  }
  
  // Create inquiry
  const inquiry = await prisma.transactionInquiry.create({
    data: {
      transactionId: data.transactionId,
      note: data.note,
      status: 'pending'
    },
    include: {
      transaction: true
    }
  });
  
  // Update transaction status
  await prisma.transaction.update({
    where: { id: data.transactionId },
    data: { status: 'pending_inquiry' }
  });
  
  // Log the inquiry
  await prisma.transactionLog.create({
    data: {
      transactionId: data.transactionId,
      action: 'inquiry_created',
      previousState: { status: transaction.status },
      currentState: { status: 'pending_inquiry' },
      note: `Inquiry created: ${data.note}`,
      performedBy: 'user'
    }
  });
  
  return { data: inquiry };
}, { allowedMethods: ['POST'] });