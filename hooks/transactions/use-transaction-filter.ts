import { useMemo } from 'react';
import { Transaction } from '@/types/transaction';
import { useFilter } from '../ui/use-filter';
import { FilterParams, Status } from '@/types/common';

interface TransactionFilterParams extends FilterParams {
  type?: 'regular' | 'special' | 'all';
}

export function useTransactionFilter(
  transactions: Transaction[],
  initialFilters: TransactionFilterParams = {}
) {
  const { filters, updateFilter, resetFilters, filterData } = useFilter<Transaction>(initialFilters);
  
  const years = useMemo(() => {
    const uniqueYears = [...new Set(transactions.map(t => t.year))];
    return uniqueYears.sort();
  }, [transactions]);
  
  const categories = useMemo(() => {
    const categoryCodes = new Set<string>();
    
    transactions.forEach(t => {
      if (t.categoryCode) categoryCodes.add(t.categoryCode);
      else if (t.internalCode) categoryCodes.add(t.internalCode);
    });
    
    return Array.from(categoryCodes).sort();
  }, [transactions]);
  
  const statuses = useMemo(() => {
    const uniqueStatuses = [...new Set(transactions.map(t => t.status))] as Status[];
    return uniqueStatuses.filter(Boolean);
  }, [transactions]);
  
  const customFilter = (transaction: Transaction, filters: TransactionFilterParams): boolean => {
    // Type filter
    if (filters.type === 'special' && !transaction.specialCategoryId) return false;
    if (filters.type === 'regular' && transaction.specialCategoryId) return false;
    
    // Year filter
    if (filters.year && transaction.year.toString() !== filters.year.toString()) return false;
    
    // Category filter
    if (filters.categoryCode) {
      const transactionCategory = transaction.categoryCode || transaction.internalCode;
      if (transactionCategory !== filters.categoryCode) return false;
    }
    
    // Status filter
    if (filters.status && transaction.status !== filters.status) return false;
    
    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const searchFields = [
        transaction.description,
        transaction.details,
        transaction.personReference,
        transaction.documentNumber,
        transaction.internalCode
      ];
      
      const matches = searchFields.some(field => 
        typeof field === 'string' && field.toLowerCase().includes(search)
      );
      
      if (!matches) return false;
    }
    
    return true;
  };
  
  const filteredTransactions = useMemo(() => {
    return filterData(transactions, customFilter);
  }, [transactions, filterData, customFilter]);
  
  return {
    filters,
    updateFilter,
    resetFilters,
    filteredTransactions,
    filterOptions: {
      years,
      categories,
      statuses
    }
  };
}