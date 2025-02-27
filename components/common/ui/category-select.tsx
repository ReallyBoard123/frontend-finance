// components/common/ui/category-select.tsx
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from '@/types/budget';

interface CategorySelectProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  parentId?: string | null;
  className?: string;
}

export function CategorySelect({
  categories,
  selectedCategoryId,
  onSelect,
  placeholder = "Select a category",
  disabled = false,
  parentId,
  className
}: CategorySelectProps) {
  const filteredCategories = parentId 
    ? categories.filter(cat => cat.parentId === parentId)
    : categories;

  return (
    <Select
      value={selectedCategoryId || ''}
      onValueChange={onSelect}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No Category</SelectItem>
        {filteredCategories.map(category => (
          <SelectItem key={category.id} value={category.id}>
            {category.code} - {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}