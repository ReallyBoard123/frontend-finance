import React from 'react';
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FilterBar } from '@/components/common/ui/filter-bar';
import { ActionButton } from '@/components/common/ui/action-button';
import { CostCell } from './cost-cell';
import { ExpandableRow } from '@/components/common/ui/expandabale-row';
import { useTransactionOperations } from '@/lib/hooks/useTransactionOperations';
import { useCategoryTree } from '@/lib/hooks/useCategoryTree';
import { useExpandableRows } from '@/lib/hooks/useExpandableRows';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Category } from '@/types/budget';
import type { YearlyTotals } from '@/types/transactions';

interface CostsSummaryProps {
  categories: Category[];
  yearlyTotals: YearlyTotals;
  onCellClick?: (e: React.MouseEvent<HTMLElement>, amount: number, year: number, categoryCode: string) => void;
  isInspectMode?: boolean;
  years?: string[];
}

export function CostsSummary({ 
  categories, 
  yearlyTotals, 
  onCellClick, 
  isInspectMode = false,
  years = ['2023', '2024', '2025']
}: CostsSummaryProps) {
  const {
    filter, 
    setFilter,
    sortConfig, 
    handleSort,
    getChildCategories,
  } = useCategoryTree(categories);
  
  const {
    expandedRows,
    toggleExpand,
  } = useExpandableRows();

  const { fetchTransactions } = useTransactionOperations();
  
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchTransactions();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const getFilteredCategories = (parentId: string | null) => {
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

  const totalsByYear = React.useMemo(() => {
    return years.reduce((acc, year) => {
      const rootCategories = getFilteredCategories(null);
      const yearTotals = rootCategories.reduce((totals, category) => {
        // Skip special categories in budget totals
        if (category.isSpecialCategory) return totals;
        
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
  }, [years, getFilteredCategories, calculateTotalBudget, calculateTotalSpent]);

  const hasFilteredResults = getFilteredCategories(null).length > 0;

  const renderCategory = (category: Category, level: number) => {
    const children = getChildCategories(category.id);
    const isExpanded = expandedRows.has(category.id);
    const hasChildren = children.length > 0;
    const isSum = category.name.toLowerCase().includes('summe');
    
    const rowStyles = `
      ${isSum ? 'bg-yellow-100 font-bold' : ''}
      ${level === 0 ? 'bg-orange-100' : ''}
      ${category.name.includes('incl. PP') ? 'bg-green-100' : ''}
      ${category.color ? `bg-[${category.color}]` : ''}
      hover:bg-gray-50
    `;

    return (
      <React.Fragment key={category.id}>
        <tr className={rowStyles}>
          <td className="px-4 py-2">
            {hasChildren ? (
              <ExpandableRow 
                isExpanded={isExpanded}
                onToggle={() => toggleExpand(category.id)}
                level={level}
              >
                <span>{category.code}</span>
              </ExpandableRow>
            ) : (
              <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
                <span>{category.code}</span>
              </div>
            )}
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
        {isExpanded && children.map(child => renderCategory(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
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
  
          <ActionButton
            onClick={handleRefresh}
            disabled={isRefreshing}
            loading={isRefreshing}
            icon={RefreshCw}
            label="Refresh Data"
            variant="outline"
            size="sm"
          />
        </div>
  
        {!hasFilteredResults && filter && (
          <Alert>
            <AlertDescription>
              No categories found matching &quot;{filter}&quot;
            </AlertDescription>
          </Alert>
        )}
  
        {isInspectMode && (
          <Alert>
            <AlertDescription>
              Inspect Mode Active - Click on any spent amount to see transaction details
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
                renderCategory(category, 0)
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