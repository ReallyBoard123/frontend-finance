// components/budget/enhanced-category-tree.tsx
import React, { useState } from 'react'
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table"
import { ChevronDown, ChevronRight, Edit2, Search, SortAsc, Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EditCategoryForm } from './edit-category-form'
import { Checkbox } from "@/components/ui/checkbox"
import { Category, CategoryFormData } from '@/types/budget'


interface EnhancedCategoryTreeProps {
  categories: Category[]
  years: number[]
  onUpdateBudget: (categoryId: string, year: string, value: number) => void
  onUpdateCategory: (categoryId: string, data: CategoryFormData) => void
}

export function EnhancedCategoryTree({ 
  categories, 
  years, 
  onUpdateBudget,
  onUpdateCategory 
}: EnhancedCategoryTreeProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{id: string, year: string} | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState("")
  const [sortConfig, setSortConfig] = useState<{key: 'code' | 'name', direction: 'asc' | 'desc'}>({
    key: 'code',
    direction: 'asc'
  })

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

  const getChildCategories = (parentId: string | null): Category[] => {
    let filtered = categories.filter(category => category.parentId === parentId)
    
    if (filter) {
      filtered = filtered.filter(category => 
        category.code.toLowerCase().includes(filter.toLowerCase()) ||
        category.name.toLowerCase().includes(filter.toLowerCase())
      )
    }

    return filtered.sort((a, b) => {
      const compare = sortConfig.direction === 'asc' ? 1 : -1
      return a[sortConfig.key] > b[sortConfig.key] ? compare : -compare
    })
  }

  const handleSort = (key: 'code' | 'name') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedRows(newExpanded)
  }

  const handleCellClick = (categoryId: string, year: string) => {
    setEditingCell({ id: categoryId, year })
  }

  const handleCellEdit = (e: React.KeyboardEvent<HTMLInputElement>, categoryId: string, year: string) => {
    if (e.key === 'Enter') {
      const value = parseFloat((e.target as HTMLInputElement).value)
      if (!isNaN(value)) {
        onUpdateBudget(categoryId, year, value)
      }
      setEditingCell(null)
    }
  }

  const handleRowSelect = (categoryId: string) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
    } else {
      newSelected.add(categoryId)
    }
    setSelectedCategories(newSelected)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setSelectedCategories(new Set())
  }

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
  }

  const handleEditSubmit = (categoryId: string, data: CategoryFormData) => {
    onUpdateCategory(categoryId, data)
    setEditingCategory(null)
  }

  const renderCategory = (category: Category, level: number) => {
    const children = getChildCategories(category.id)
    const isExpanded = expandedRows.has(category.id)
    const hasChildren = children.length > 0
    const isSelected = selectedCategories.has(category.id)
    
    return (
      <React.Fragment key={category.id}>
        <TableRow 
          className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
          style={{ backgroundColor: !isSelected ? (category.color || 'transparent') : undefined }}
          onClick={() => handleRowClick(category)}
        >
          <TableCell className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
            {hasChildren && (
              <Button 
                variant="ghost" 
                size="sm"
                className="p-0 h-6 w-6 mr-2"
                onClick={() => toggleExpand(category.id)}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </Button>
            )}
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => handleRowSelect(category.id)}
              className="mr-2"
            />
            <span className="mr-2">{category.code}</span>
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
                  calculateTotalBudget(category.id, year.toString()).toLocaleString('de-DE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }) :
                  (category.budgets[year.toString()] || 0).toLocaleString('de-DE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
              )}
            </TableCell>
          ))}
          <TableCell className="text-right font-bold">
            {years.reduce((sum, year) => 
              sum + (hasChildren ? 
                calculateTotalBudget(category.id, year.toString()) : 
                (category.budgets[year.toString()] || 0)
              ), 0
            ).toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </TableCell>
        </TableRow>
        {isExpanded && children.map(child => renderCategory(child, level + 1))}
      </React.Fragment>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Filter categories..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => handleSort('code')}
          className="gap-2"
        >
          <SortAsc size={16} />
          Sort by Code
        </Button>
        <Button 
          variant="outline" 
          onClick={() => handleSort('name')}
          className="gap-2"
        >
          <SortAsc size={16} />
          Sort by Name
        </Button>
        {selectedCategories.size === 1 && (
          <Button
            onClick={() => {
              const categoryId = Array.from(selectedCategories)[0]
              const category = categories.find(c => c.id === categoryId)
              if (category) {
                handleEdit(category)
              }
            }}
            className="gap-2"
          >
            <Edit2 size={16} />
            Edit Category
          </Button>
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
          categories={categories}
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  )
}