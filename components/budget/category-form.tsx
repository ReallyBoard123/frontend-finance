// components/budget/category-form.tsx
import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FormDialog } from "@/components/common/dialogs/form-dialog";
import { Input } from "@/components/ui/input";
import { CategorySelect } from "@/components/common/ui/category-select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from '@/components/ui/checkbox';
import { useCategoryOperations } from '@/lib/hooks/useCategoryOperations';

// Removed Select, SelectContent, SelectItem, SelectTrigger, SelectValue since we're removing the category type selection

const categorySchema = z.object({
  code: z.string().regex(/^F\d{4}$/, "Must be in format F#### (e.g., F0861)"),
  name: z.string().min(1, "Name is required"),
  isSpecialCategory: z.boolean(),
  parentId: z.string().nullable(),
  budgets: z.record(z.string(), z.number().min(0, "Budget must be positive")).optional(),
  color: z.string().optional()
});

type CategoryFormSchema = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryForm({ open, onOpenChange }: CategoryFormProps) {
  const { categories, isLoading, addCategory } = useCategoryOperations();
  
  const form = useForm<CategoryFormSchema>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: '',
      name: '',
      parentId: null,
      isSpecialCategory: false,
      budgets: {
        "2023": 0,
        "2024": 0,
        "2025": 0
      },
      color: ''
    }
  });
  
  const isSpecialCategory = form.watch("isSpecialCategory");

  const handleSubmit = async (data: CategoryFormSchema) => {
    await addCategory(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <FormDialog
      title="Add New Category"
      isOpen={open}
      onClose={() => onOpenChange(false)}
      onSubmit={form.handleSubmit(handleSubmit)}
      isSubmitting={isLoading}
      submitLabel="Create Category"
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
                <FormDescription>
                  Use for special category types
                </FormDescription>
              </FormItem>
            )}
          />

          {/* Removed the CategoryType selector that included 600 and 23152 options */}

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
                  <Input placeholder="Gesamtausgaben" {...field} />
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
                    categories={categories}
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

          {!isSpecialCategory && [2023, 2024, 2025].map(year => (
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