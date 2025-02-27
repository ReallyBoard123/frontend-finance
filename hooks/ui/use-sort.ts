import { useState, useCallback } from 'react';
import { SortParams } from '@/types/common';

export function useSort<T>(initialField: string, initialDirection: 'asc' | 'desc' = 'asc') {
  const [sortParams, setSortParams] = useState<SortParams>({
    field: initialField,
    direction: initialDirection
  });

  const toggleSort = useCallback((field: string) => {
    setSortParams(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const sortedData = useCallback((data: T[], accessor?: (item: T) => any) => {
    return [...data].sort((a, b) => {
      const aValue = accessor ? accessor(a) : (a as any)[sortParams.field];
      const bValue = accessor ? accessor(b) : (b as any)[sortParams.field];
      
      // Handle different value types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortParams.direction === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortParams.direction === 'asc' 
          ? aValue.getTime() - bValue.getTime() 
          : bValue.getTime() - aValue.getTime();
      }
      
      return sortParams.direction === 'asc' 
        ? (aValue > bValue ? 1 : -1) 
        : (aValue > bValue ? -1 : 1);
    });
  }, [sortParams]);

  return { sortParams, toggleSort, sortedData };
}