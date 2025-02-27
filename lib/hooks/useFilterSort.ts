import { useState, useMemo } from 'react';

type SortDirection = 'asc' | 'desc';

interface SortConfig<T> {
  key: keyof T;
  direction: SortDirection;
}

export function useFilterSort<T extends Record<string, any>>(
  items: T[],
  initialSortConfig: SortConfig<T>
) {
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>(initialSortConfig);

  const handleSort = (key: keyof T) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSortedItems = useMemo(() => {
    let filtered = items;

    if (filter) {
      const searchTerm = filter.toLowerCase();
      filtered = filtered.filter(item => {
        return Object.entries(item).some(([_, value]) => {
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchTerm);
          }
          return false;
        });
      });
    }

    return [...filtered].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      const aValue: any = a[sortConfig.key];
      const bValue: any = b[sortConfig.key];
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return (aValue.getTime() - bValue.getTime()) * direction;
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * direction;
      }
      
      const aStr = String(aValue || '');
      const bStr = String(bValue || '');
      return aStr.localeCompare(bStr) * direction;
    });
  }, [items, filter, sortConfig]);

  return {
    filter,
    setFilter,
    sortConfig,
    handleSort,
    filteredAndSortedItems
  };
}