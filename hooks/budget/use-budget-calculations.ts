import { useMemo } from 'react';
import { Category } from '@/types/category';
import { Transaction } from '@/types/transaction';
import { YearlyTotals } from '@/types/transaction';

interface UseBudgetCalculationsProps {
  categories: Category[];
  transactions: Transaction[];
  years?: string[];
}

export function useBudgetCalculations({ 
  categories, 
  transactions, 
  years = ["2023", "2024", "2025"]
}: UseBudgetCalculationsProps) {
  
  // Calculate yearly totals
  const yearlyTotals = useMemo<YearlyTotals>(() => {
    const totals: YearlyTotals = {};
    
    // Initialize totals structure
    years.forEach(year => {
      totals[year] = {};
      
      // Set up each category's initial values
      categories.forEach(category => {
        totals[year][category.code] = {
          spent: 0,
          budget: category.budgets?.[year] || 0,
          remaining: category.budgets?.[year] || 0,
          count: 0,
          transactions: []
        };
      });
    });
    
    // Process transactions
    transactions.forEach(transaction => {
      const year = transaction.year.toString();
      if (!years.includes(year)) return;
      
      const categoryCode = transaction.categoryCode;
      if (!categoryCode || !totals[year][categoryCode]) return;
      
      totals[year][categoryCode].spent += transaction.amount;
      totals[year][categoryCode].remaining = 
        totals[year][categoryCode].budget - totals[year][categoryCode].spent;
      totals[year][categoryCode].count++;
      totals[year][categoryCode].transactions.push(transaction.id);
      
      // Update parent categories
      const category = categories.find(c => c.code === categoryCode);
      if (!category) return;
      
      let parentId = category.parentId;
      while (parentId) {
        const parent = categories.find(c => c.id === parentId);
        if (!parent) break;
        
        totals[year][parent.code].spent += transaction.amount;
        totals[year][parent.code].remaining = 
          totals[year][parent.code].budget - totals[year][parent.code].spent;
        
        parentId = parent.parentId;
      }
    });
    
    return totals;
  }, [categories, transactions, years]);
  
  // Calculate total budget and spent by year
  const yearTotals = useMemo(() => {
    return years.reduce((acc, year) => {
      const rootCategories = categories.filter(c => !c.parentId);
      
      const yearTotal = rootCategories.reduce((total, category) => {
        // Skip special categories in totals
        if (category.metadata?.isSpecialCategory) return total;
        
        const categoryTotal = yearlyTotals[year][category.code];
        return {
          budget: total.budget + (categoryTotal?.budget || 0),
          spent: total.spent + (categoryTotal?.spent || 0)
        };
      }, { budget: 0, spent: 0 });
      
      acc[year] = {
        ...yearTotal,
        remaining: yearTotal.budget - yearTotal.spent
      };
      
      return acc;
    }, {} as Record<string, { budget: number; spent: number; remaining: number }>);
  }, [categories, yearlyTotals, years]);
  
  // Get transactions for a specific category and year
  const getTransactionsForCategory = (categoryCode: string, year: string) => {
    if (!yearlyTotals[year] || !yearlyTotals[year][categoryCode]) {
      return [];
    }
    
    const transactionIds = yearlyTotals[year][categoryCode].transactions;
    return transactions.filter(t => transactionIds.includes(t.id));
  };
  
  return {
    yearlyTotals,
    yearTotals,
    getTransactionsForCategory
  };
}