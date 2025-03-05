// lib/hooks/useTransactionOperations.ts
import { useState } from 'react';
import { useFinanceStore } from '@/lib/store';
import type { Transaction, TransactionUpdate, YearlyTotals } from '@/types/transactions';
import type { Category } from '@/types/budget';

export function useTransactionOperations() {
  const { costs, setCosts, categories } = useFinanceStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async (type = 'regular') => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/transactions${type !== 'regular' ? `?type=${type}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      
      const data = await response.json();
      const transactions = data.transactions || [];
      
      // Update the store with fetched data
      if (categories.length > 0) {
        const specialResponse = await fetch(`/api/transactions?type=special`);
        const specialData = await specialResponse.json();
        const specialTransactions = specialData.transactions || [];
        
        // Match transactions to categories
        const matchedTransactions = matchTransactionsToCategories(transactions, categories);
        
        const yearlyTotals = calculateYearlyTotals(matchedTransactions, categories);
        
        const processedData = {
          transactions: matchedTransactions,
          specialTransactions,
          yearlyTotals
        };
        
        setCosts(processedData);
      }
      
      return transactions;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const updateTransaction = async (transactionId: string, updates: TransactionUpdate) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update transaction');

      if (costs?.transactions) {
        const updatedTransactions = costs.transactions.map(transaction =>
          transaction.id === transactionId ? { ...transaction, ...updates } : transaction
        );
        
        // Re-match transactions with categories
        const matchedTransactions = matchTransactionsToCategories(updatedTransactions, categories);
        
        const updatedData = {
          ...costs,
          transactions: matchedTransactions,
          yearlyTotals: calculateYearlyTotals(matchedTransactions, categories)
        };
        
        setCosts(updatedData);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTransactionCategory = async (
    transactionId: string, 
    categoryId: string, 
    categoryCode: string, 
    categoryName: string
  ) => {
    setIsLoading(true);
    try {
      const updates = {
        categoryId,
        categoryCode,
        categoryName,
        status: 'processed' as const // Mark as processed when assigning a category
      };
      
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update transaction category');

      if (costs?.transactions) {
        const updatedTransactions = costs.transactions.map(transaction =>
          transaction.id === transactionId ? { ...transaction, ...updates } : transaction
        );
        
        const updatedData = {
          ...costs,
          transactions: updatedTransactions,
          yearlyTotals: calculateYearlyTotals(updatedTransactions, categories)
        };
        
        setCosts(updatedData);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced function to ensure all transactions are properly associated with categories
  const matchTransactionsToCategories = (transactions: Transaction[], categories: Category[]): Transaction[] => {
    return transactions.map(transaction => {
      // If transaction already has a categoryCode and categoryId, keep it
      if (transaction.categoryCode && transaction.categoryId) {
        return transaction;
      }
      
      // For transactions with only categoryCode but no categoryId
      if (transaction.categoryCode && !transaction.categoryId) {
        const category = categories.find(c => c.code === transaction.categoryCode);
        if (category) {
          return {
            ...transaction,
            categoryId: category.id,
            categoryName: category.name
          };
        }
      }
      
      // For transactions with internalCode that might match a category
      const internalCodeFormatted = `F${transaction.internalCode.padStart(4, '0')}`;
      const category = categories.find(c => c.code === internalCodeFormatted);
      
      if (category && !transaction.requiresSpecialHandling) {
        return {
          ...transaction,
          categoryId: category.id,
          categoryCode: category.code,
          categoryName: category.name
        };
      }
      
      return transaction;
    });
  };

  const calculateYearlyTotals = (transactions: Transaction[], categories: Category[]): YearlyTotals => {
    const yearlyTotals: Record<string, Record<string, { 
      spent: number; 
      budget: number; 
      remaining: number; 
      transactions: Transaction[]; 
      isSpecialCategory: boolean 
    }>> = {};
    
    const years = [...new Set(transactions.map(t => t.year.toString()))];
    
    years.forEach(year => {
      yearlyTotals[year] = {};
      categories.forEach(category => {
        yearlyTotals[year][category.code] = {
          spent: 0,
          budget: category.budgets?.[year] || 0,
          remaining: category.budgets?.[year] || 0,
          transactions: [],
          isSpecialCategory: category.isSpecialCategory || false
        };
      });
    });
  
    transactions.forEach(transaction => {
      const year = transaction.year.toString();
      const categoryCode = transaction.categoryCode;
      if (!categoryCode || !yearlyTotals[year]) return;
      
      if (yearlyTotals[year][categoryCode]) {
        yearlyTotals[year][categoryCode].spent += transaction.amount;
        yearlyTotals[year][categoryCode].remaining = 
          yearlyTotals[year][categoryCode].budget - yearlyTotals[year][categoryCode].spent;
        yearlyTotals[year][categoryCode].transactions.push(transaction);
      }
  
      const category = categories.find(c => c.code === categoryCode);
      if (!category) return;
  
      // Also update parent category totals
      const parentCategory = categories.find(c => c.id === category.parentId);
      if (parentCategory && yearlyTotals[year][parentCategory.code]) {
        yearlyTotals[year][parentCategory.code].spent += transaction.amount;
        yearlyTotals[year][parentCategory.code].remaining = 
          yearlyTotals[year][parentCategory.code].budget - yearlyTotals[year][parentCategory.code].spent;
      }
    });
  
    return yearlyTotals;
  };

  // Function to manually refresh yearly totals (but not automatically)
  const refreshYearlyTotals = () => {
    if (!costs?.transactions || categories.length === 0) return;
    
    const matchedTransactions = matchTransactionsToCategories(costs.transactions, categories);
    const yearlyTotals = calculateYearlyTotals(matchedTransactions, categories);
    
    setCosts({
      ...costs,
      transactions: matchedTransactions,
      yearlyTotals
    });
  };

  const validateTransaction = (transaction: Transaction) => {
    const requiredFields = [
      'projectCode', 'year', 'amount', 'internalCode', 
      'description', 'transactionType', 'bookingDate'
    ];
    const fixableFields = ['costGroup'];
  
    const missingFields = requiredFields.filter(field => {
      const value = transaction[field as keyof Transaction];
      return value === undefined || value === null || value === '';
    });
  
    const missingFixableFields = fixableFields.filter(field => {
      const value = transaction[field as keyof Transaction];
      return value === undefined || value === null || value === '';
    });
  
    return {
      isValid: missingFields.length === 0,
      missingFields,
      fixableFields: missingFixableFields
    };
  };

  const exportTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/export');
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transactions-export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Remove the auto-refresh effect that would cause infinite API calls

  return { 
    costs,
    isLoading,
    error,
    fetchTransactions, 
    updateTransaction, 
    updateTransactionCategory,
    calculateYearlyTotals,
    refreshYearlyTotals,
    matchTransactionsToCategories,
    validateTransaction,
    exportTransactions
  };
}