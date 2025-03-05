// components/dashboard/BudgetSummary.tsx
import React, { useState, useEffect } from 'react';
import { ActionButton } from '@/components/common/ui/action-button';
import { RefreshCw, ChevronRight, ChevronDown, Search, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
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
    const getBgColor = () => {
      if (level === 0) return 'bg-orange-50';
      if (category.name.toLowerCase().includes('summe')) return 'bg-yellow-50';
      if (category.color) return `bg-[${category.color}]`;
      return '';
    };
    
    return (
      <React.Fragment key={category.id}>
        <tr className={`hover:bg-gray-50 ${getBgColor()}`}>
          <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 z-10 ${getBgColor()}`}>
            <div className="flex items-center" style={{ paddingLeft: `${level * 16}px` }}>
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
              <span className="font-mono">{category.code}</span>
            </div>
          </td>
          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 sticky left-[140px] z-10 bg-inherit">
            {category.name}
          </td>
          
          {yearData.map(data => (
            <React.Fragment key={data.year}>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                {data.budget.toLocaleString('de-DE')} €
              </td>
              <td 
                className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                  isInspectMode ? 'cursor-pointer hover:bg-blue-50' : ''
                }`}
                onClick={isInspectMode && onCellClick ? 
                  () => onCellClick(data.spent, data.year, category.code) : 
                  undefined
                }
              >
                {data.spent.toLocaleString('de-DE')} €
              </td>
              <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                data.remaining >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.remaining.toLocaleString('de-DE')} €
              </td>
            </React.Fragment>
          ))}
          
          {/* Total columns */}
          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium bg-blue-50">
            {totalBudget.toLocaleString('de-DE')} €
          </td>
          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium bg-blue-50">
            {totalSpent.toLocaleString('de-DE')} €
          </td>
          <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium bg-blue-50 ${
            totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {totalRemaining.toLocaleString('de-DE')} €
          </td>
        </tr>
        
        {/* Render children if expanded */}
        {isExpanded && children.map(child => renderCategoryWithChildren(child, level + 1))}
      </React.Fragment>
    );
  };
  
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

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Budget Summary</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter categories..."
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            <button
              onClick={expandAll}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
            >
              Expand All
            </button>
            
            <button
              onClick={collapseAll}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
            >
              Collapse All
            </button>
            
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
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-[140px] bg-gray-50 z-10">
                Name
              </th>
              {displayYears.map(year => (
                <React.Fragment key={year}>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {year} Budget
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spent
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining
                  </th>
                </React.Fragment>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                Total Budget
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                Total Spent
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                Remaining
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rootCategories.length === 0 ? (
              <tr>
                <td colSpan={3 + displayYears.length * 3 + 3} className="px-4 py-4 text-center text-sm text-gray-500">
                  {filter ? `No categories found matching "${filter}"` : 'No categories available'}
                </td>
              </tr>
            ) : (
              rootCategories.map(category => renderCategoryWithChildren(category, 0))
            )}
          </tbody>
          {/* Footer with totals removed as requested */}
        </table>
      </div>
    </div>
  );
}