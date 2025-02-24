import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CostCell } from './cost-cell';
import type { Category } from '@/types/budget';
import type { YearlyTotals } from '@/types/transactions';

interface CostsSummaryProps {
  categories: Category[];
  yearlyTotals: YearlyTotals;
  onCellClick?: (e: React.MouseEvent<HTMLElement>, amount: number, year: number, categoryCode: string) => void;
  isInspectMode?: boolean;
}

export function CostsSummary({ 
  categories, 
  yearlyTotals, 
  onCellClick, 
  isInspectMode = false 
}: CostsSummaryProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: 'code' | 'name',
    direction: 'asc' | 'desc'
  }>({
    key: 'code',
    direction: 'asc'
  });

  const years = ['2023', '2024', '2025'];

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedRows(newExpanded);
  };

  const calculateTotalBudget = (categoryId: string, year: string): number => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 0;

    const childCategories = categories.filter(c => c.parentId === categoryId);
    if (childCategories.length === 0) {
      return category.budgets[year] || 0;
    }

    return childCategories.reduce((sum, child) => 
      sum + calculateTotalBudget(child.id, year), 0
    );
  };

  const calculateTotalSpent = (categoryId: string, year: string): number => {
    const totals = yearlyTotals[year];
    if (!totals) return 0;

    const category = categories.find(c => c.id === categoryId);
    if (!category) return 0;

    const childCategories = categories.filter(c => c.parentId === categoryId);
    if (childCategories.length === 0) {
      return totals[category.code]?.spent || 0;
    }

    return childCategories.reduce((sum, child) => 
      sum + calculateTotalSpent(child.id, year), 0
    );
  };

  const getFilteredCategories = (parentId: string | null): Category[] => {
    let filtered = categories.filter(category => category.parentId === parentId);
    
    if (filter) {
      filtered = filtered.filter(category => 
        category.code.toLowerCase().includes(filter.toLowerCase()) ||
        category.name.toLowerCase().includes(filter.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      const compare = sortConfig.direction === 'asc' ? 1 : -1;
      return a[sortConfig.key] > b[sortConfig.key] ? compare : -compare;
    });
  };

  const handleSort = (key: 'code' | 'name') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const renderCategoryRow = (category: Category, level: number) => {
    const children = getFilteredCategories(category.id);
    const isExpanded = expandedRows.has(category.id);
    const hasChildren = children.length > 0;
    const isSum = category.name.toLowerCase().includes('summe');
    
    const rowStyles = `
      ${isSum ? 'bg-yellow-100 font-bold' : ''}
      ${level === 0 ? 'bg-orange-100' : ''}
      ${category.name.includes('incl. PP') ? 'bg-green-100' : ''}
      hover:bg-gray-50
    `;

    return (
      <React.Fragment key={category.id}>
        <tr className={rowStyles}>
          <td className="px-4 py-2">
            <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
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
              <span>{category.code}</span>
            </div>
          </td>
          <td className="px-4 py-2">{category.name}</td>
          {years.map(year => {
            const budget = hasChildren ? 
              calculateTotalBudget(category.id, year) : 
              (category.budgets[year] || 0);
            
            const spent = hasChildren ?
              calculateTotalSpent(category.id, year) :
              (yearlyTotals[year]?.[category.code]?.spent || 0);
            
            const remaining = budget - spent;
            
            return (
              <React.Fragment key={year}>
                <td className="px-4 py-2 text-right">
                  {budget.toLocaleString('de-DE')} €
                </td>
                <CostCell 
                  amount={spent}
                  onCellClick={onCellClick}
                  isInspectMode={isInspectMode}
                  year={parseInt(year)}
                  categoryCode={category.code}
                />
                <td className={`px-4 py-2 text-right ${
                  remaining < 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {remaining.toLocaleString('de-DE')} €
                </td>
              </React.Fragment>
            );
          })}
        </tr>
        {isExpanded && children.map(child => renderCategoryRow(child, level + 1))}
      </React.Fragment>
    );
  };

  const totalsByYear = useMemo(() => {
    return years.reduce((acc, year) => {
      const rootCategories = getFilteredCategories(null);
      const yearTotals = rootCategories.reduce((totals, category) => {
        const budget = calculateTotalBudget(category.id, year);
        const spent = calculateTotalSpent(category.id, year);
        return {
          budget: totals.budget + budget,
          spent: totals.spent + spent
        };
      }, { budget: 0, spent: 0 });
      acc[year] = yearTotals;
      return acc;
    }, {} as Record<string, { budget: number, spent: number }>);
  }, [categories, yearlyTotals, filter]);

  const hasFilteredResults = getFilteredCategories(null).length > 0;

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex gap-4 mb-4">
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
            Sort by Code
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleSort('name')}
            className="gap-2"
          >
            Sort by Name
          </Button>
        </div>

        {!hasFilteredResults && filter && (
          <Alert>
            <AlertDescription>
              No categories found matching "{filter}"
            </AlertDescription>
          </Alert>
        )}

        {isInspectMode && (
          <Alert>
            <AlertDescription>
              Inspect Mode Active - Double click on any spent amount to see transaction details
            </AlertDescription>
          </Alert>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Name</th>
                {years.map(year => (
                  <React.Fragment key={year}>
                    <th className="px-4 py-2 text-right">{year} Budget</th>
                    <th className="px-4 py-2 text-right">Spent</th>
                    <th className="px-4 py-2 text-right">Remaining</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {getFilteredCategories(null).map(category => 
                renderCategoryRow(category, 0)
              )}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td className="px-4 py-2" colSpan={2}>Total</td>
                {years.map(year => {
                  const yearTotal = totalsByYear[year];
                  const remaining = yearTotal.budget - yearTotal.spent;
                  return (
                    <React.Fragment key={year}>
                      <td className="px-4 py-2 text-right">
                        {yearTotal.budget.toLocaleString('de-DE')} €
                      </td>
                      <CostCell 
                        amount={yearTotal.spent}
                        onCellClick={onCellClick}
                        isInspectMode={isInspectMode}
                        year={parseInt(year)}
                        categoryCode="total"
                      />
                      <td className={`px-4 py-2 text-right ${
                        remaining < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {remaining.toLocaleString('de-DE')} €
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Card>
  );
}