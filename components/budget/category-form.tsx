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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategoryOperations } from '@/lib/hooks/useCategoryOperations';

const categorySchema = z.object({
  code: z.string().regex(/^F\d{4}$/, "Must be in format F#### (e.g., F0861)"),
  name: z.string().min(1, "Name is required"),
  isSpecialCategory: z.boolean(),
  categoryType: z.string().optional(),
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
      categoryType: undefined,
      budgets: {
        "2023": 0,
        "2024": 0,
        "2025": 0
      },
      color: ''
    }
  });
  
  const isSpecialCategory = form.watch("isSpecialCategory");
  const categoryType = form.watch("categoryType");

  // Auto-fill fields for special categories
  React.useEffect(() => {
    if (isSpecialCategory && categoryType) {
      if (categoryType === "ALLOCATION") {
        form.setValue("code", "F0600");
        form.setValue("name", "ELVI: Festlegungen");
      } else if (categoryType === "PAYMENT") {
        form.setValue("code", "F23152");
        form.setValue("name", "Zuweisung für laufende Zwecke");
      }
    }
  }, [isSpecialCategory, categoryType, form]);

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
                  Use for special types like allocations (600) or payments (23152)
                </FormDescription>
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
                    </SelectContent>
                  </Select>
                  <FormDescription>Determines how transactions are processed</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {(!isSpecialCategory || !categoryType) && (
            <>
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
            </>
          )}

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