// types/transactions.ts
export interface Transaction {
  id: string;
  projectCode: string;
  year: number;
  amount: number;
  internalCode: string;
  description: string;
  costGroup: string;
  transactionType: string;
  documentNumber?: string;
  bookingDate: Date;
  personReference?: string;
  details?: string;
  invoiceDate?: Date | null;
  invoiceNumber?: string;
  paymentPartner?: string;
  internalAccount?: string;
  accountLabel?: string;
  categoryId?: string | null; // Made optional
  categoryCode?: string;
  categoryName?: string;
  requiresSpecialHandling: boolean;
  categoryParentCode?: string | null;
  categoryParentId?: string | null;
  status?: 'pending' | 'completed' | 'unprocessed' | 'pending_inquiry';
  inquiries?: TransactionInquiry[];
  note?: string;
  previousState?: {
    status?: string;
    note?: string;
    categoryCode?: string;
  } | null;
  metadata?: Record<string, any>
}

export interface TransactionUpdate {
  id?: string;
  status?: 'pending' | 'completed' | 'unprocessed' | 'pending_inquiry';
  note?: string;
  categoryCode?: string;
  categoryId?: string | null; // Made optional
  categoryName?: string;
  previousState?: {
    status?: string;
    note?: string;
    categoryCode?: string;
    categoryId?: string;
    categoryName?: string;
  } | null;
}

export interface CategoryTotal {
  spent: number;
  budget: number;
  remaining: number;
  transactions: Transaction[];
}

export interface YearlyTotals {
  [year: string]: {
    [categoryCode: string]: CategoryTotal;
  };
}

export interface ProcessedData {
  transactions: Transaction[];
  yearlyTotals: YearlyTotals;
  specialTransactions: Transaction[];
}

export interface BudgetUpdate {
  categoryCode: string;
  year: number;
  spent: number;
  remaining: number;
}

export interface TransactionInquiry {
  id: string;
  transactionId: string;
  transaction: Transaction;
  note: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: string | Date;
  updatedAt: string | Date;
}