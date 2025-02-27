import { useState, useCallback } from 'react';
import { FilterParams } from '@/types/common';

export function useFilter<T>(initialFilters: FilterParams = {}) {
  const [filters, setFilters] = useState<FilterParams>(initialFilters);

  const updateFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const filterData = useCallback((data: T[], customFilter?: (item: T, filters: FilterParams) => boolean) => {
    return data.filter(item => {
      if (customFilter) {
        return customFilter(item, filters);
      }
      
      // Default filtering logic
      for (const [key, value] of Object.entries(filters)) {
        if (!value) continue;
        
        if (key === 'search' && typeof value === 'string' && value.trim()) {
          const searchRegex = new RegExp(value, 'i');
          const matches = Object.values(item as { [key: string]: unknown }).some(val => 
            typeof val === 'string' && searchRegex.test(val)
          );
          if (!matches) return false;
        } else if ((item as any)[key] !== undefined && (item as any)[key] !== value) {
          return false;
        }
      }
      
      return true;
    });
  }, [filters]);

  return { filters, updateFilter, resetFilters, filterData };
}