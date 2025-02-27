import { Status } from './common';

export interface TransactionBase {
  projectCode: string;
  year: number;
  amount: number;
  internalCode: string;
  description: string;
  costGroup?: string;
  transactionType: string;
  documentNumber?: string;
  bookingDate: Date | string;
  personReference?: string;
  details?: string;
  invoiceDate?: Date | string | null;
  invoiceNumber?: string;
  paymentPartner?: string;
  internalAccount?: string;
  accountLabel?: string;
  status?: Status;
  metadata?: Record<string, any>;
}

export interface Transaction extends TransactionBase {
  id: string;
  categoryId?: string | null;
  categoryCode?: string;
  categoryName?: string;
  specialCategoryId?: string | null;
  specialCategoryCode?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface TransactionUpdate {
  id?: string;
  status?: Status;
  categoryId?: string | null;
  specialCategoryId?: string | null;
  categoryCode?: string | null; // Changed to allow null
  categoryName?: string | null; // Changed to allow null
  previousState?: Partial<Transaction>;
  metadata?: Record<string, any>;
}

export interface TransactionLog {
  id: string;
  transactionId: string;
  action: string;
  previousState?: Record<string, any>;
  currentState?: Record<string, any>;
  note?: string;
  performedBy: string;
  createdAt: string | Date;
}

export interface YearlyTotal {
  spent: number;
  budget: number;
  remaining: number;
  count: number;
  transactions: string[]; // Array of transaction IDs
}

export interface CategoryYearlyTotals {
  [categoryCode: string]: YearlyTotal;
}

export interface YearlyTotals {
  [year: string]: CategoryYearlyTotals;
}

export interface ProcessedData {
  transactions: Transaction[];
  yearlyTotals: YearlyTotals;
  specialTransactions: Transaction[];
}