import { Transaction } from './transaction';

export interface InquiryBase {
  transactionId: string;
  note: string;
  status?: 'pending' | 'resolved' | 'rejected';
}

export interface Inquiry extends InquiryBase {
  id: string;
  transaction?: Transaction;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface InquiryFormData extends InquiryBase {}

export interface InquiryUpdate {
  status: 'pending' | 'resolved' | 'rejected';
  note?: string;
}