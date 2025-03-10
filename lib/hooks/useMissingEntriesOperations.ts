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

  // Create a set of parent category IDs for quick lookup
  const parentCategoryIds = useMemo(() => {
    const parentIds = new Set<string>();
    categories.forEach(category => {
      if (categories.some(c => c.parentId === category.id)) {
        parentIds.add(category.id);
      }
    });
    return parentIds;
  }, [categories]);

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
    
    // If it has 'processed' or 'completed' status, it's properly mapped
    if (transaction.status === 'processed' || transaction.status === 'completed') {
      return true;
    }
    
    // If it doesn't have a categoryId, it's not properly mapped
    if (!transaction.categoryId) return false;
    
    // Check if the category is a parent category
    if (transaction.categoryId && parentCategoryIds.has(transaction.categoryId)) {
      return false; // Parent categories need to be mapped to child categories
    }
    
    // If the category code doesn't start with F, it's not properly mapped
    if (!transaction.categoryCode || !transaction.categoryCode.startsWith('F')) {
      return false;
    }
    
    // All other transactions with category assigned are considered properly mapped
    return true;
  };

  const missingEntries = useMemo(() => {
    const missing = transactions.filter(transaction => !isProperlyMapped(transaction));
    console.log(`Found ${missing.length} transactions missing proper category mapping`);
    
    // Log missing parent category transactions for debugging
    const missingParentCategoryTransactions = missing.filter(t => 
      t.categoryId && parentCategoryIds.has(t.categoryId)
    );
    if (missingParentCategoryTransactions.length > 0) {
      console.log(`${missingParentCategoryTransactions.length} transactions have parent categories that need child assignment`);
    }
    
    return missing;
  }, [transactions, categories, parentCategoryIds, isProperlyMapped]);

  return {
    expandedRow,
    toggleRowExpand,
    isProperlyMapped,
    missingEntries,
    parentCategoryIds
  };
}