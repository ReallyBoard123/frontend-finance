// lib/hooks/useMissingEntriesOperations.ts
import { useState, useMemo } from 'react';
import type { Transaction } from '@/types/transactions';
import type { Category } from '@/types/budget';
import { isElviTransaction, isZuweisungTransaction, shouldAppearInMissingEntries } from '@/lib/specialCategoryUtils';

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
    const normalizedInternalCode = transaction.internalCode.replace(/^0+/, '');
    
    // ELVI transactions (600) should always appear in missing entries unless completed
    if (normalizedInternalCode === '600') {
      return transaction.status === 'completed';
    }
    
    // Zuweisung transactions (23152) are considered properly mapped
    if (normalizedInternalCode === '23152') {
      return true;
    }
    
    const metadata = transaction.metadata as { needsReview?: boolean } || {};
    if (metadata.needsReview === true) return false;
    
    if (!transaction.categoryId) return false;
    
    if (!transaction.categoryCode || !transaction.categoryCode.startsWith('F')) {
      return false;
    }
    
    const category = categories.find(c => c.code === transaction.categoryCode);
    if (!category) return false;
  
    const isParent = categories.some(c => c.parentId === category.id);
    if (!isParent) return true;
  
    const childCategories = categories.filter(c => c.parentId === category.id);
    return childCategories.some(child => child.code === transaction.categoryCode);
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