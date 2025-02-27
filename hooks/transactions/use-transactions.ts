import { useCallback, useEffect } from 'react';
import { useFinanceStore } from '@/lib/store';
import { Transaction, TransactionUpdate } from '@/types/transaction';
import { FilterParams } from '@/types/common';
import { useErrorHandler } from '../ui/use-error-handler';
import { transactionService } from '@/services/transaction-service';

export function useTransactions(initialFilters: FilterParams = {}) {
  const { 
    transactions, 
    specialTransactions, 
    isLoading, 
    error, 
    fetchTransactions, 
    setError 
  } = useFinanceStore(state => ({
    transactions: state.costs?.transactions || [],
    specialTransactions: state.costs?.specialTransactions || [],
    isLoading: state.isLoading.transactions,
    error: state.error.transactions,
    fetchTransactions: state.fetchTransactions,
    setError: state.setError
  }));
  
  const { handleError } = useErrorHandler();

  const refreshTransactions = useCallback(async (filters?: FilterParams) => {
    try {
      // Fetch from service instead of store to support filters
      const result = await transactionService.getAll(filters);
      // Update store with result - assuming store has a setCosts or similar function
      // You'll need to implement this in your store
      await fetchTransactions();
    } catch (error) {
      handleError(error, 'Failed to fetch transactions');
    }
  }, [fetchTransactions, handleError]);

  const updateTransaction = useCallback(async (id: string, updates: TransactionUpdate): Promise<Transaction | null> => {
    try {
      const result = await transactionService.update(id, updates);
      await refreshTransactions(); // Refresh after update
      return result;
    } catch (error) {
      handleError(error, 'Failed to update transaction');
      return null;
    }
  }, [refreshTransactions, handleError]);

  const updateTransactionCategory = useCallback(async (
    transactionId: string, 
    categoryId: string | null,
    categoryCode: string | null,
    categoryName: string | null
  ): Promise<boolean> => {
    try {
      const transaction = [...transactions, ...specialTransactions]
        .find(t => t.id === transactionId);
        
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      const previousState = {
        categoryId: transaction.categoryId,
        categoryCode: transaction.categoryCode,
        categoryName: transaction.categoryName
      };
      
      const result = await transactionService.update(transactionId, {
        categoryId,
        categoryCode,
        categoryName,
        status: 'completed',
        previousState
      });
      
      await refreshTransactions();
      return !!result;
    } catch (error) {
      handleError(error, 'Failed to update transaction category');
      return false;
    }
  }, [transactions, specialTransactions, refreshTransactions, handleError]);

  // Auto-fetch transactions on mount if empty
  useEffect(() => {
    if (transactions.length === 0 && !isLoading && !error) {
      refreshTransactions(initialFilters);
    }
  }, [transactions.length, isLoading, error, refreshTransactions, initialFilters]);

  // Clear error on unmount
  useEffect(() => {
    return () => {
      setError('transactions', undefined);
    };
  }, [setError]);

  return {
    transactions,
    specialTransactions,
    allTransactions: [...transactions, ...specialTransactions],
    isLoading,
    error,
    refreshTransactions,
    updateTransaction,
    updateTransactionCategory
  };
}