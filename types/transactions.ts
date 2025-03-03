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
  categoryId?: string | null;
  categoryCode?: string | null | undefined;
  categoryName?: string;
  requiresSpecialHandling: boolean;
  categoryParentCode?: string | null;
  categoryParentId?: string | null;
  status?: TransactionStatus;
  previousState?: TransactionPreviousState | null;
  isSplit?: boolean;
  totalSplits?: number;
  originalAmount?: number;
  metadata?: TransactionMetadata;
}

export type TransactionStatus = 'pending' | 'completed' | 'unprocessed' | 'pending_inquiry';

export interface TransactionPreviousState {
  status?: TransactionStatus;
  note?: string;
  categoryCode?: string;
  categoryId?: string;
  categoryName?: string;
}

export interface TransactionUpdate {
  id?: string;
  status?: TransactionStatus;
  note?: string;
  categoryCode?: string;
  categoryId?: string | null;
  categoryName?: string;
  previousState?: TransactionPreviousState | null;
  requiresSpecialHandling?: boolean;
  amount?: number;
  description?: string;
  personReference?: string;
  details?: string;
}

export interface TransactionMetadata {
  needsReview?: boolean;
  originalInternalCode?: string;
  categoryCode?: string | null;
  splitId?: string | null;
  fingerprint?: string; // Used for matching transactions across exports
}

export interface CategoryTotal {
  spent: number;
  budget: number;
  remaining: number;
  transactions: Transaction[];
  isSpecialCategory?: boolean;
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