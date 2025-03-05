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
      if (transactions.length > 0) {
        const specialResponse = await fetch(`/api/transactions?type=special`);
        const specialData = await specialResponse.json();
        const specialTransactions = specialData.transactions || [];
        
        const processedData = {
          transactions,
          specialTransactions,
          yearlyTotals: calculateYearlyTotals(transactions, categories)
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

  const calculateYearlyTotals = (transactions: Transaction[], categories: Category[]): YearlyTotals => {
    const yearlyTotals: Record<string, Record<string, { spent: number; budget: number; remaining: number; transactions: Transaction[]; isSpecialCategory: boolean }>> = {};
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
      if (!categoryCode) return;
      
      if (yearlyTotals[year][categoryCode]) {
        yearlyTotals[year][categoryCode].spent += transaction.amount;
        yearlyTotals[year][categoryCode].remaining = 
          yearlyTotals[year][categoryCode].budget - yearlyTotals[year][categoryCode].spent;
        yearlyTotals[year][categoryCode].transactions.push(transaction);
      }
  
      const category = categories.find(c => c.code === categoryCode);
      if (!category) return;
  
      const parentCategory = categories.find(c => c.id === category.parentId);
      if (parentCategory && yearlyTotals[year][parentCategory.code]) {
        yearlyTotals[year][parentCategory.code].spent += transaction.amount;
        yearlyTotals[year][parentCategory.code].remaining = 
          yearlyTotals[year][parentCategory.code].budget - yearlyTotals[year][parentCategory.code].spent;
      }
    });
  
    return yearlyTotals;
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

  return { 
    costs,
    isLoading,
    error,
    fetchTransactions, 
    updateTransaction, 
    updateTransactionCategory,
    calculateYearlyTotals,
    validateTransaction,
    exportTransactions
  };
}