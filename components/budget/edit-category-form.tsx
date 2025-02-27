// components/budget/edit-category-form.tsx
import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FormDialog } from "@/components/common/dialogs/form-dialog";
import { Input } from "@/components/ui/input";
import { CategorySelect } from "@/components/common/ui/category-select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category, CategoryFormData } from "@/types/budget";
import { useCategoryOperations } from '@/lib/hooks/useCategoryOperations';

const categorySchema = z.object({
  code: z.string().regex(/^F\d{4}$/, "Must be in format F#### (e.g., F0861)"),
  name: z.string().min(1, "Name is required"),
  parentId: z.string().nullable(),
  isSpecialCategory: z.boolean().optional(),
  categoryType: z.string().optional(),
  budgets: z.record(z.string(), z.number().min(0, "Budget must be positive")).optional(),
  color: z.string().optional()
});

interface EditCategoryFormProps {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCategoryForm({ category, open, onOpenChange }: EditCategoryFormProps) {
  const { categories, isLoading, updateCategory } = useCategoryOperations();
  
  const hasChildren = React.useMemo(() => 
    categories.some(c => c.parentId === category.id),
    [categories, category.id]
  );

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: category.code,
      name: category.name,
      parentId: category.parentId,
      isSpecialCategory: category.isSpecialCategory || false,
      categoryType: category.categoryType,
      budgets: hasChildren ? undefined : category.budgets,
      color: category.color || ''
    }
  });

  const isSpecialCategory = form.watch("isSpecialCategory");

  const handleSubmit = async (data: CategoryFormData) => {
    // Only include budgets if it's a leaf node
    const submitData = hasChildren ? 
      { ...data, budgets: undefined } : 
      data;
    await updateCategory(category.id, submitData);
    onOpenChange(false);
  };

  const availableParents = categories.filter(c => c.id !== category.id);

  return (
    <FormDialog
      title="Edit Category"
      isOpen={open}
      onClose={() => onOpenChange(false)}
      onSubmit={form.handleSubmit(handleSubmit)}
      isSubmitting={isLoading}
      submitLabel="Save Changes"
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="isSpecialCategory"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                  />
                </FormControl>
                <FormLabel>Special Category (excluded from budget totals)</FormLabel>
              </FormItem>
            )}
          />

          {isSpecialCategory && (
            <FormField
              control={form.control}
              name="categoryType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ALLOCATION">Allocation (600)</SelectItem>
                      <SelectItem value="PAYMENT">Payment (23152)</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Determines how transactions are processed</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Code</FormLabel>
                <FormControl>
                  <Input placeholder="F0861" {...field} />
                </FormControl>
                <FormDescription>Format: F#### (e.g., F0861)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
            
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Name</FormLabel>
                <FormControl>
                  <Input placeholder="Category name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent Category</FormLabel>
                <FormControl>
                  <CategorySelect 
                    categories={availableParents}
                    selectedCategoryId={field.value || ''}
                    onSelect={field.onChange}
                    placeholder="Select parent category"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Row Color (optional)</FormLabel>
                <FormControl>
                  <Input type="color" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isSpecialCategory && !hasChildren && [2023, 2024, 2025].map(year => (
            <FormField
              key={year}
              control={form.control}
              name={`budgets.${year}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget {year}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>
      </Form>
    </FormDialog>
  );
}