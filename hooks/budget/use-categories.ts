import { useCallback, useEffect } from 'react';
import { useFinanceStore } from '@/lib/store';
import { Category, CategoryFormData, CategoryTree } from '@/types/category';
import { useErrorHandler } from '../ui/use-error-handler';
import { categoryService } from '@/services/category-service';

export function useCategories() {
  const { categories, isLoading, error, fetchCategories, setError } = useFinanceStore(state => ({
    categories: state.categories,
    isLoading: state.isLoading.categories,
    error: state.error.categories,
    fetchCategories: state.fetchCategories,
    setError: state.setError
  }));
  
  const { handleError } = useErrorHandler();

  const refreshCategories = useCallback(async () => {
    try {
      await fetchCategories();
    } catch (error) {
      handleError(error, 'Failed to fetch categories');
    }
  }, [fetchCategories, handleError]);

  const createCategory = useCallback(async (data: CategoryFormData): Promise<Category | null> => {
    try {
      const result = await categoryService.create(data);
      await refreshCategories(); // Refresh after creation
      return result;
    } catch (error) {
      handleError(error, 'Failed to create category');
      return null;
    }
  }, [refreshCategories, handleError]);

  const updateCategory = useCallback(async (id: string, data: Partial<CategoryFormData>): Promise<Category | null> => {
    try {
      const result = await categoryService.update(id, data);
      await refreshCategories(); // Refresh after update
      return result;
    } catch (error) {
      handleError(error, 'Failed to update category');
      return null;
    }
  }, [refreshCategories, handleError]);

  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    try {
      await categoryService.delete(id);
      await refreshCategories(); // Refresh after deletion
      return true;
    } catch (error) {
      handleError(error, 'Failed to delete category');
      return false;
    }
  }, [refreshCategories, handleError]);

  // Get category tree
  const getCategoryTree = useCallback(() => {
    const rootCategories = categories.filter(c => !c.parentId);
    
    const buildTree = (parentCategories: Category[], level = 0): CategoryTree[] => {
      return parentCategories.map(category => {
        const children = categories.filter(c => c.parentId === category.id);
        return {
          category,
          children: buildTree(children, level + 1),
          level
        };
      });
    };
    
    return buildTree(rootCategories);
  }, [categories]);

  // Auto-fetch categories when hook is used
  useEffect(() => {
    if (categories.length === 0 && !isLoading && !error) {
      refreshCategories();
    }
  }, [categories.length, isLoading, error, refreshCategories]);

  // Clear error when unmounting
  useEffect(() => {
    return () => {
      setError('categories', undefined);
    };
  }, [setError]);

  return {
    categories,
    isLoading,
    error,
    refreshCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    categoryTree: getCategoryTree()
  };
}