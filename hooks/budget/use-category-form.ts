import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { Category, CategoryFormData } from '@/types/category';

const categorySchema = z.object({
  code: z.string().regex(/^[A-Z0-9]+$/, "Must be an alphanumeric code"),
  name: z.string().min(1, "Name is required"),
  parentId: z.string().nullable(),
  budgets: z.record(z.string(), z.number().min(0, "Budget must be positive")).optional(),
  color: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface UseCategoryFormProps {
  category?: Category;
  years?: string[];
  onSubmit: (data: CategoryFormData) => void;
}

export function useCategoryForm({ category, years = ["2023", "2024", "2025"], onSubmit }: UseCategoryFormProps) {
  const [hasChildren, setHasChildren] = useState(false);
  const isEditMode = !!category;

  const defaultValues: CategoryFormValues = {
    code: category?.code || '',
    name: category?.name || '',
    parentId: category?.parentId || null,
    budgets: category?.budgets || years.reduce((acc, year) => ({ ...acc, [year]: 0 }), {}),
    color: category?.color || '#FFFFFF',
    metadata: category?.metadata || {}
  };

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues
  });

  // Check if category has children
  useEffect(() => {
    if (isEditMode && category?.id) {
      // This would typically be handled by a query or store function
      // For now we're assuming this information would be passed in
      setHasChildren(false);
    }
  }, [isEditMode, category]);

  const handleSubmit = (data: CategoryFormValues) => {
    // If it's a parent category, don't include budgets
    const formattedData: CategoryFormData = {
      ...data,
      budgets: hasChildren ? undefined : data.budgets
    };
    
    onSubmit(formattedData);
    
    if (!isEditMode) {
      form.reset(defaultValues);
    }
  };

  return {
    form,
    isEditMode,
    hasChildren,
    handleSubmit: form.handleSubmit(handleSubmit)
  };
}