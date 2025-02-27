// components/budget/enhanced-category-tree.tsx
import React, { useState } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { EditCategoryForm } from './edit-category-form';
import { FilterBar } from '@/components/common/ui/filter-bar';

import { ActionButton } from '@/components/common/ui/action-button';
import { Edit2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Category, CategoryFormData } from '@/types/budget';
import { useCategoryTree } from '@/lib/hooks/useCategoryTree';
import { useSelectionState } from '@/lib/hooks/useSelectionState';
import { ExpandableRow } from '../common/ui/expandabale-row';

interface EnhancedCategoryTreeProps {
  categories: Category[];
  years: number[];
  onUpdateBudget: (categoryId: string, year: string, value: number) => void;
  onUpdateCategory?: (categoryId: string, data: CategoryFormData) => void;
}

export function EnhancedCategoryTree({ 
  categories, 
  years, 
  onUpdateBudget
}: EnhancedCategoryTreeProps) {
  const {
    expandedRows, 
    filter, 
    setFilter,
    handleSort,
    getChildCategories,
    toggleExpand
  } = useCategoryTree(categories);
  
  const {
    selectedItems: selectedCategories,
    toggleSelection: toggleRowSelect,
    clearSelection
  } = useSelectionState();
  
  const [editingCell, setEditingCell] = useState<{id: string, year: string} | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const calculateTotalBudget = (categoryId: string, year: string): number => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 0;
    
    // Skip special categories in budget calculations
    if (category.isSpecialCategory) return 0;
  
    const childCategories = categories.filter(c => c.parentId === categoryId);
    if (childCategories.length === 0) {
      return category.budgets[year] || 0;
    }
  
    return childCategories.reduce((sum, child) => 
      sum + calculateTotalBudget(child.id, year), 0
    );
  };

  const handleCellClick = (categoryId: string, year: string) => {
    setEditingCell({ id: categoryId, year });
  };

  const handleCellEdit = (e: React.KeyboardEvent<HTMLInputElement>, categoryId: string, year: string) => {
    if (e.key === 'Enter') {
      const value = parseFloat((e.target as HTMLInputElement).value);
      if (!isNaN(value)) {
        onUpdateBudget(categoryId, year, value);
      }
      setEditingCell(null);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    clearSelection();
  };

  const [clickCount, setClickCount] = useState<{id: string; count: number; timer: NodeJS.Timeout | null}>({
    id: '',
    count: 0,
    timer: null
  });

  const handleRowClick = (category: Category) => {
    if (clickCount.timer) {
      clearTimeout(clickCount.timer);
    }

    if (category.id === clickCount.id) {
      const newCount = clickCount.count + 1;
      if (newCount === 3) {
        handleEdit(category);
        setClickCount({ id: '', count: 0, timer: null });
        return;
      }
      setClickCount({
        id: category.id,
        count: newCount,
        timer: setTimeout(() => {
          setClickCount({ id: '', count: 0, timer: null });
        }, 300)
      });
    } else {
      setClickCount({
        id: category.id,
        count: 1,
        timer: setTimeout(() => {
          setClickCount({ id: '', count: 0, timer: null });
        }, 300)
      });
    }
  };

  const renderCategory = (category: Category, level: number) => {
    const children = getChildCategories(category.id);
    const isExpanded = expandedRows.has(category.id);
    const hasChildren = children.length > 0;
    const isSelected = selectedCategories.has(category.id);
    
    return (
      <React.Fragment key={category.id}>
        <TableRow 
          className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
          style={{ backgroundColor: !isSelected ? (category.color || 'transparent') : undefined }}
          onClick={() => handleRowClick(category)}
        >
          <TableCell>
            <div className="flex items-center">
              {hasChildren && (
                <ExpandableRow 
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpand(category.id)}
                  level={level}
                >
                  <div className="flex items-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRowSelect(category.id)}
                      className="mr-2"
                      onClick={e => e.stopPropagation()}
                    />
                    <span>{category.code}</span>
                  </div>
                </ExpandableRow>
              )}
              {!hasChildren && (
                <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleRowSelect(category.id)}
                    className="mr-2"
                    onClick={e => e.stopPropagation()}
                  />
                  <span>{category.code}</span>
                </div>
              )}
            </div>
          </TableCell>
          <TableCell>{category.name}</TableCell>
          {years.map((year) => (
            <TableCell 
              key={year} 
              className="text-right cursor-pointer hover:bg-gray-100"
              onClick={() => !hasChildren && handleCellClick(category.id, year.toString())}
            >
              {editingCell?.id === category.id && editingCell?.year === year.toString() ? (
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={category.budgets[year.toString()] || 0}
                  className="w-32 text-right"
                  autoFocus
                  onKeyDown={(e) => handleCellEdit(e, category.id, year.toString())}
                  onBlur={() => setEditingCell(null)}
                />
              ) : (
                hasChildren ? 
                  new Intl.NumberFormat('de-DE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }).format(calculateTotalBudget(category.id, year.toString())) :
                  new Intl.NumberFormat('de-DE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }).format(category.budgets[year.toString()] || 0)
              )}
            </TableCell>
          ))}
          <TableCell className="text-right font-bold">
            {new Intl.NumberFormat('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }).format(years.reduce((sum, year) => 
              sum + (hasChildren ? 
                calculateTotalBudget(category.id, year.toString()) : 
                (category.budgets[year.toString()] || 0)
              ), 0)
            )}
          </TableCell>
        </TableRow>
        {isExpanded && children.map(child => renderCategory(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 justify-between">
        <FilterBar
          filter={filter}
          onFilterChange={setFilter}
          onSort={key => handleSort(key as 'code' | 'name')}
          sortFields={[
            { key: 'code', label: 'Sort by Code' },
            { key: 'name', label: 'Sort by Name' }
          ]}
          placeholder="Filter categories..."
          className="flex-1"
        />
        
        {selectedCategories.size === 1 && (
          <ActionButton
            onClick={() => {
              const categoryId = Array.from(selectedCategories)[0];
              const category = categories.find(c => c.id === categoryId);
              if (category) {
                handleEdit(category);
              }
            }}
            icon={Edit2}
            label="Edit Category"
          />
        )}
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            {years.map((year) => (
              <TableHead key={year} className="text-right">{year}</TableHead>
            ))}
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {getChildCategories(null).map(category => renderCategory(category, 0))}
        </TableBody>
      </Table>
      
      {editingCategory && (
        <EditCategoryForm
          category={editingCategory}
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
        />
      )}
    </div>
  );
}