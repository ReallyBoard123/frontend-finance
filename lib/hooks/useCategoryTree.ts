import { useMemo, useState } from 'react';
import type { Category } from '@/types/budget';

export function useCategoryTree(categories: Category[]) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: 'code' | 'name',
    direction: 'asc' | 'desc'
  }>({
    key: 'code',
    direction: 'asc'
  });

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (key: 'code' | 'name') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getChildCategories = (parentId: string | null) => {
    let filtered = categories.filter(category => category.parentId === parentId);
    
    if (filter) {
      filtered = filtered.filter(category => 
        category.code.toLowerCase().includes(filter.toLowerCase()) ||
        category.name.toLowerCase().includes(filter.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      const compare = sortConfig.direction === 'asc' ? 1 : -1;
      return a[sortConfig.key] > b[sortConfig.key] ? compare : -compare;
    });
  };

  const rootCategories = useMemo(() => getChildCategories(null), 
    [categories, filter, sortConfig, getChildCategories]);

  const isParentCategory = (categoryId: string) => {
    return categories.some(c => c.parentId === categoryId);
  };

  return {
    expandedRows,
    filter,
    setFilter,
    sortConfig,
    rootCategories,
    getChildCategories,
    toggleExpand,
    handleSort,
    isParentCategory
  };
}