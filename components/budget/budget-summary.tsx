// components/budget/budget-summary.tsx
import React, { useState, useEffect } from 'react';
import { ActionButton } from '@/components/common/ui/action-button';
import { RefreshCw, ChevronRight, ChevronDown, Search, Eye, EyeOff } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category } from '@/types/budget';
import type { YearlyTotals } from '@/types/transactions';

interface BudgetSummaryProps {
  categories: Category[];
  yearlyTotals: YearlyTotals;
  onCellClick?: (amount: number, year: number | string, categoryCode: string) => void;
  isInspectMode?: boolean;
  years?: string[];
  className?: string;
  onRefresh?: () => void;
}

export function BudgetSummary({ 
  categories = [], 
  yearlyTotals = {},
  onCellClick,
  isInspectMode: initialInspectMode = false,
  years = ['2023', '2024', '2025'],
  className = '',
  onRefresh
}: BudgetSummaryProps) {
  const [filter, setFilter] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialExpansionDone, setInitialExpansionDone] = useState(false);
  const [isInspectMode, setIsInspectMode] = useState(initialInspectMode);
  const [visibleYears, setVisibleYears] = useState<Set<string>>(new Set(years));
  
  // Function to expand all categories on initial load - only once
  useEffect(() => {
    if (categories.length > 0 && !initialExpansionDone) {
      // Expand all parent categories by default
      const parentIds = new Set(
        categories
          .filter(cat => categories.some(c => c.parentId === cat.id))
          .map(cat => cat.id)
      );
      setExpandedCategories(parentIds);
      setInitialExpansionDone(true);
    }
  }, [categories, initialExpansionDone]);
  
  const toggleCategory = (categoryId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const expandAll = () => {
    const allParentIds = new Set(
      categories
        .filter(cat => categories.some(c => c.parentId === cat.id))
        .map(cat => cat.id)
    );
    setExpandedCategories(allParentIds);
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };
  
  const toggleYearVisibility = (year: string) => {
    const newVisibleYears = new Set(visibleYears);
    if (newVisibleYears.has(year)) {
      newVisibleYears.delete(year);
    } else {
      newVisibleYears.add(year);
    }
    setVisibleYears(newVisibleYears);
  };

  // Filter categories based on search term
  const filteredCategories = categories.filter(category => 
    filter === '' || 
    category.code.toLowerCase().includes(filter.toLowerCase()) || 
    category.name.toLowerCase().includes(filter.toLowerCase())
  );
  
  // Get root categories (those with no parent)
  const rootCategories = filteredCategories.filter(category => category.parentId === null);
  
  // Get child categories for a parent
  const getChildCategories = (parentId: string): Category[] => {
    return filteredCategories.filter(category => category.parentId === parentId);
  };
  
  // Only display the years that are visible
  const displayYears = years.filter(year => visibleYears.has(year));
  
  // Calculate budget for a category
  const calculateBudget = (categoryId: string, year: string): number => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return 0;
    
    // If this is a leaf node, return its budget
    if (!categories.some(c => c.parentId === categoryId)) {
      return category.budgets?.[year] || 0;
    }
    
    // If this is a parent node, calculate sum of all children
    const childBudgets = categories
      .filter(c => c.parentId === categoryId)
      .reduce((sum, child) => sum + calculateBudget(child.id, year), 0);
    
    return childBudgets;
  };
  
  // Calculate spent amount for a category
  const calculateSpent = (categoryId: string, year: string): number => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category || !yearlyTotals[year]) return 0;
    
    // If this is a leaf node, return its spent amount
    if (!categories.some(c => c.parentId === categoryId)) {
      return yearlyTotals[year][category.code]?.spent || 0;
    }
    
    // If this is a parent node, calculate sum of all children
    const childSpent = categories
      .filter(c => c.parentId === categoryId)
      .reduce((sum, child) => sum + calculateSpent(child.id, year), 0);
    
    return childSpent;
  };
  
  // Recursively render a category and all its descendants
  const renderCategoryWithChildren = (category: Category, level: number) => {
    const children = getChildCategories(category.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    
    // Calculate totals across all visible years
    const yearData = displayYears.map(year => {
      const budget = calculateBudget(category.id, year);
      const spent = calculateSpent(category.id, year);
      const remaining = budget - spent;
      
      return { year, budget, spent, remaining };
    });
    
    const totalBudget = yearData.reduce((sum, data) => sum + data.budget, 0);
    const totalSpent = yearData.reduce((sum, data) => sum + data.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    
    // Custom bg-color based on category level and type
    let rowBgColor = '';
    if (level === 0) rowBgColor = 'bg-orange-50';
    else if (category.name.toLowerCase().includes('summe')) rowBgColor = 'bg-yellow-50';
    else if (category.color) rowBgColor = `bg-[${category.color}]`;
    
    return (
      <React.Fragment key={category.id}>
        <tr className="border-b border-gray-200">
          {/* Code column - NOT STICKY */}
          <td className="whitespace-nowrap border-r border-gray-200 min-w-[120px]">
            <div className={`h-12 px-4 flex items-center ${rowBgColor}`} style={{ paddingLeft: `${level * 16 + 16}px` }}>
              {hasChildren ? (
                <button 
                  className="mr-2 focus:outline-none"
                  onClick={(e) => toggleCategory(category.id, e)}
                >
                  {isExpanded ? 
                    <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  }
                </button>
              ) : (
                <div className="w-6"></div> // Spacer for alignment
              )}
              <span className="font-mono text-sm">{category.code}</span>
            </div>
          </td>
          
          {/* Name column - STICKY */}
          <td 
            className="whitespace-nowrap sticky left-0 z-20 border-r border-gray-200 min-w-[300px]" 
            style={{ backgroundColor: rowBgColor || 'white' }}
          >
            <div className={`h-12 px-4 flex items-center text-sm ${rowBgColor}`}>
              {category.name}
            </div>
          </td>
          
          {/* Dynamic year columns - Budget, Spent, Remaining */}
          {yearData.map(data => (
            <React.Fragment key={data.year}>
              <td className="border-r border-gray-200 min-w-[150px]">
                <div className={`px-4 h-12 flex items-center justify-end text-sm whitespace-nowrap ${rowBgColor}`}>
                  {data.budget.toLocaleString('de-DE')} €
                </div>
              </td>
              <td 
                className={`border-r border-gray-200 min-w-[150px] ${
                  isInspectMode ? 'cursor-pointer hover:bg-blue-50' : ''
                }`}
                onClick={isInspectMode && onCellClick ? 
                  () => onCellClick(data.spent, data.year, category.code) : 
                  undefined
                }
              >
                <div className={`px-4 h-12 flex items-center justify-end text-sm font-medium whitespace-nowrap ${rowBgColor}`}>
                  {data.spent.toLocaleString('de-DE')} €
                </div>
              </td>
              <td className="border-r border-gray-200 min-w-[150px]">
                <div className={`px-4 h-12 flex items-center justify-end text-sm font-medium whitespace-nowrap ${
                  data.remaining >= 0 ? 'text-green-600' : 'text-red-600'
                } ${rowBgColor}`}>
                  {data.remaining.toLocaleString('de-DE')} €
                </div>
              </td>
            </React.Fragment>
          ))}
          
          {/* Total columns */}
          <td className="border-r border-gray-200 min-w-[150px] bg-blue-50">
            <div className="px-4 h-12 flex items-center justify-end text-sm font-medium whitespace-nowrap">
              {totalBudget.toLocaleString('de-DE')} €
            </div>
          </td>
          <td className="border-r border-gray-200 min-w-[150px] bg-blue-50">
            <div className="px-4 h-12 flex items-center justify-end text-sm font-medium whitespace-nowrap">
              {totalSpent.toLocaleString('de-DE')} €
            </div>
          </td>
          <td className="min-w-[150px] bg-blue-50">
            <div className={`px-4 h-12 flex items-center justify-end text-sm font-medium whitespace-nowrap ${
              totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {totalRemaining.toLocaleString('de-DE')} €
            </div>
          </td>
        </tr>
        
        {/* Render children if expanded */}
        {isExpanded && children.map(child => renderCategoryWithChildren(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Budget Summary</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter categories..."
                className="pl-9 pr-4 py-2 w-64"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
              className="text-sm text-gray-600"
            >
              Expand All
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
              className="text-sm text-gray-600"
            >
              Collapse All
            </Button>
            
            <ActionButton
              onClick={handleRefresh}
              disabled={isRefreshing}
              loading={isRefreshing}
              icon={RefreshCw}
              label="Refresh"
              variant="outline"
              size="sm"
            />
          </div>
        </div>
        
        {/* Column visibility and inspect mode toggles */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Inspect Mode:</span>
            <Switch 
              checked={isInspectMode} 
              onCheckedChange={setIsInspectMode} 
              aria-label="Toggle inspect mode"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Visible Years:</span>
            {years.map(year => (
              <div key={year} className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className={`px-2 flex items-center gap-1 ${visibleYears.has(year) ? 'border-blue-500 text-blue-600' : 'text-gray-500'}`}
                  onClick={() => toggleYearVisibility(year)}
                >
                  {visibleYears.has(year) ? <Eye size={14} /> : <EyeOff size={14} />}
                  {year}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="relative overflow-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {/* Header for Code column - NOT STICKY */}
              <th className="border-r border-gray-200 min-w-[120px]">
                <div className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </div>
              </th>
              
              {/* Header for Name column - STICKY */}
              <th 
                className="sticky left-0 z-30 bg-gray-50 border-r border-gray-200 shadow-sm min-w-[300px]"
              >
                <div className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </div>
              </th>
              
              {/* Dynamic year column headers */}
              {displayYears.map(year => (
                <React.Fragment key={year}>
                  <th className="border-r border-gray-200 min-w-[150px]">
                    <div className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {year} Budget
                    </div>
                  </th>
                  <th className="border-r border-gray-200 min-w-[150px]">
                    <div className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Spent
                    </div>
                  </th>
                  <th className="border-r border-gray-200 min-w-[150px]">
                    <div className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remaining
                    </div>
                  </th>
                </React.Fragment>
              ))}
              
              {/* Total column headers */}
              <th className="border-r border-gray-200 min-w-[150px] bg-blue-50">
                <div className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Budget
                </div>
              </th>
              <th className="border-r border-gray-200 min-w-[150px] bg-blue-50">
                <div className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </div>
              </th>
              <th className="min-w-[150px] bg-blue-50">
                <div className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rootCategories.length === 0 ? (
              <tr>
                <td 
                  colSpan={3 + displayYears.length * 3 + 3} 
                  className="px-4 py-4 text-center text-sm text-gray-500"
                >
                  {filter ? `No categories found matching "${filter}"` : 'No categories available'}
                </td>
              </tr>
            ) : (
              rootCategories.map(category => renderCategoryWithChildren(category, 0))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}