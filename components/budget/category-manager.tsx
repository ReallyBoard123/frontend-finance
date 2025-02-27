// components/budget/category-manager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { CategoryForm } from './category-form';
import { CategoryUploader } from './category-uploader';
import { EnhancedCategoryTree } from './enhanced-category-tree';
import { ActionButton } from '@/components/common/ui/action-button';
import { Plus } from 'lucide-react';
import { useCategoryOperations } from '@/lib/hooks/useCategoryOperations';

export function CategoryManager() {
  const [open, setOpen] = useState(false);
  const { categories, fetchCategories, updateCategoryBudget, updateCategory } = useCategoryOperations();
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  useEffect(() => {
    // Only fetch once on initial mount
    if (!initialFetchDone) {
      fetchCategories();
      setInitialFetchDone(true);
    }
  }, [fetchCategories, initialFetchDone]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Budget Categories</h2>
        <ActionButton 
          onClick={() => setOpen(true)} 
          icon={Plus} 
          label="Add Category"
        />
      </div>

      <CategoryUploader />
      <div className="mt-6">
        <CategoryForm 
          open={open} 
          onOpenChange={setOpen}
        />
        <EnhancedCategoryTree 
          categories={categories} 
          years={[2023, 2024, 2025]}
          onUpdateBudget={updateCategoryBudget}
          onUpdateCategory={updateCategory}
        />
      </div>
    </div>
  );
}