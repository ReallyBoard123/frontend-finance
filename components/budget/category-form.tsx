import React, { useEffect } from 'react'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FolderTree } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import type { Category, CategoryFormData } from "@/types/budget"
import { Checkbox } from '../ui/checkbox'

const categorySchema = z.object({
  code: z.string().regex(/^F\d{4}$/, "Must be in format F#### (e.g., F0861)"),
  name: z.string().min(1, "Name is required"),
  isSpecialCategory: z.boolean(),
  categoryType: z.string().optional(),
  parentId: z.string().nullable(),
  budgets: z.record(z.string(), z.number().min(0, "Budget must be positive")).optional(),
  color: z.string().optional()
})

type CategoryFormSchema = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  categories: Category[]
  onSubmit: (data: CategoryFormData) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CategoryForm({ categories, onSubmit, open, onOpenChange }: CategoryFormProps) {
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
  })
  
  const isSpecialCategory = form.watch("isSpecialCategory");
  const categoryType = form.watch("categoryType");

  // Auto-fill fields for special categories
  useEffect(() => {
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

  const handleSubmit = (data: CategoryFormSchema) => {
    onSubmit(data)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

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

          {/* Only show code/name fields for normal categories or if no special category type selected */}
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
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Parent</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.code} - {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

          {/* Only show budget fields for normal categories */}
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

            <Button type="submit" className="w-full">
              <FolderTree className="mr-2 h-4 w-4" />
              Create Category
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}