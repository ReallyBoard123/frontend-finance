// lib/hooks/useCategoryOperations.ts
import { useState, useCallback } from 'react';
import { useFinanceStore } from '@/lib/store';
import type { Category, CategoryFormData } from '@/types/budget';

export function useCategoryOperations() {
  const { categories, setCategories } = useFinanceStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use useCallback to prevent infinite loop
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data: Category[] = await response.json();
      const formattedCategories = data.map(category => ({
        ...category,
        budgets: category.budgets || {},
      }));
      setCategories(formattedCategories);
      return formattedCategories;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [setCategories]);

  const addCategory = async (data: CategoryFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to add category');
      
      const newCategory = await response.json();
      setCategories([...categories, newCategory]);
      return newCategory;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCategory = async (categoryId: string, data: CategoryFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to update category');
      
      const updatedCategory = await response.json();
      setCategories(categories.map(c => 
        c.id === categoryId ? updatedCategory : c
      ));
      return updatedCategory;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCategoryBudget = async (categoryId: string, year: string, value: number) => {
    setIsLoading(true);
    try {
      const category = categories.find(c => c.id === categoryId);
      if (!category) throw new Error('Category not found');

      const updatedCategory = {
        ...category,
        budgets: {
          ...category.budgets,
          [year]: value
        }
      };

      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgets: updatedCategory.budgets }),
      });

      if (!response.ok) throw new Error('Failed to update budget');

      setCategories(categories.map(c => 
        c.id === categoryId ? updatedCategory : c
      ));
      return updatedCategory;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalBudget = (categoryId: string, year: string): number => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 0;
    
    if (category.isSpecialCategory) return 0;
  
    const childCategories = categories.filter(c => c.parentId === categoryId);
    if (childCategories.length === 0) {
      return category.budgets[year] || 0;
    }
  
    return childCategories.reduce((sum, child) => 
      sum + calculateTotalBudget(child.id, year), 0
    );
  };

  return { 
    categories, 
    isLoading, 
    error,
    fetchCategories, 
    addCategory, 
    updateCategory, 
    updateCategoryBudget,
    calculateTotalBudget,
    setCategories
  };
}