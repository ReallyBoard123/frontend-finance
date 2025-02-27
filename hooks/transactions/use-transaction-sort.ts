import { useMemo } from 'react';
import { Transaction } from '@/types/transaction';
import { useSort } from '../ui/use-sort';

type TransactionSortField = 'date' | 'amount' | 'category' | 'description' | 'reference' | 'status';

export function useTransactionSort(
  transactions: Transaction[],
  initialField: TransactionSortField = 'date',
  initialDirection: 'asc' | 'desc' = 'desc'
) {
  const { sortParams, toggleSort } = useSort<Transaction>(initialField, initialDirection);
  
  const getSortAccessor = (transaction: Transaction, field: string): any => {
    switch (field) {
      case 'date':
        return new Date(transaction.bookingDate).getTime();
      case 'amount':
        return transaction.amount;
      case 'category':
        return transaction.categoryCode || transaction.internalCode || '';
      case 'description':
        return transaction.description || '';
      case 'reference':
        return transaction.personReference || '';
      case 'status':
        return transaction.status || '';
      default:
        return transaction[field as keyof Transaction] || '';
    }
  };
  
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const aValue = getSortAccessor(a, sortParams.field);
      const bValue = getSortAccessor(b, sortParams.field);
      
      const direction = sortParams.direction === 'asc' ? 1 : -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction * aValue.localeCompare(bValue);
      }
      
      return direction * (aValue > bValue ? 1 : -1);
    });
  }, [transactions, sortParams]);
  
  return {
    sortParams,
    toggleSort,
    sortedTransactions
  };
}