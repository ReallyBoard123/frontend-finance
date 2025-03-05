// lib/hooks/useMissingEntriesOperations.ts
import { useState, useMemo } from 'react';
import type { Transaction } from '@/types/transactions';
import type { Category } from '@/types/budget';

export function useMissingEntriesOperations(transactions: Transaction[], categories: Category[]) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRowExpand = (transactionId: string) => {
    if (expandedRow === transactionId) {
      setExpandedRow(null);
    } else {
      setExpandedRow(transactionId);
    }
  };

  const isProperlyMapped = (transaction: Transaction): boolean => {
    // Normalize internal code
    const normalizedInternalCode = transaction.internalCode?.replace(/^0+/, '') || '';
    
    // ELVI transactions (600) should always appear in missing entries unless completed
    if (normalizedInternalCode === '600') {
      return transaction.status === 'processed' || transaction.status === 'completed';
    }
    
    // Zuweisung transactions (23152) are considered properly mapped
    if (normalizedInternalCode === '23152') {
      return true;
    }
    
    // Check if transaction has inquiry pending
    if (transaction.status === 'pending_inquiry') {
      return false;
    }
    
    // If it has a status of "missing", it's not properly mapped
    if (transaction.status === 'missing') {
      return false;
    }
    
    // If it doesn't have a categoryId or categoryCode, it's not properly mapped
    if (!transaction.categoryId) return false;
    
    if (!transaction.categoryCode || !transaction.categoryCode.startsWith('F')) {
      return false;
    }
    
    // All other transactions with category assigned are considered properly mapped
    return true;
  };

  const missingEntries = useMemo(() => {
    return transactions.filter(transaction => !isProperlyMapped(transaction));
  }, [transactions, categories]);

  return {
    expandedRow,
    toggleRowExpand,
    isProperlyMapped,
    missingEntries
  };
}