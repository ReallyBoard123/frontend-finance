// components/common/ui/filter-bar.tsx
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SortAsc } from 'lucide-react';

interface FilterBarProps {
  filter: string;
  onFilterChange: (value: string) => void;
  onSort?: (key: string) => void;
  sortFields?: Array<{ key: string; label: string }>;
  placeholder?: string;
  className?: string;
}

export function FilterBar({
  filter,
  onFilterChange,
  onSort,
  sortFields = [],
  placeholder = "Filter...",
  className
}: FilterBarProps) {
  return (
    <div className={`flex gap-4 items-center ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          placeholder={placeholder}
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="pl-8"
        />
      </div>
      
      {sortFields.map(field => (
        <Button
          key={field.key}
          variant="outline"
          onClick={() => onSort?.(field.key)}
          className="gap-2"
        >
          <SortAsc className="h-4 w-4" />
          {field.label}
        </Button>
      ))}
    </div>
  );
}