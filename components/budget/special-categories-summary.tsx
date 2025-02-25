// components/budget/special-categories-summary.tsx
import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Transaction } from '@/types/transactions';
import { Category } from '@/types/budget';

interface SpecialCategorySummaryProps {
  transactions: Transaction[];
  categories: Category[];
  years: string[];
}

export function SpecialCategorySummary({ transactions, categories, years }: SpecialCategorySummaryProps) {
  // Find special categories
  const specialCategories = categories.filter(c => c.isSpecialCategory);
  
  // Calculate totals by special category and year
  const specialTotals = useMemo(() => {
    const result: Record<string, Record<string, { 
      allocated: number, 
      received: number,
      count: number 
    }>> = {};
    
    // Initialize structure
    specialCategories.forEach(category => {
      result[category.code] = {};
      years.forEach(year => {
        result[category.code][year] = { 
          allocated: 0, 
          received: 0,
          count: 0
        };
      });
    });
    
    // Process transactions
    transactions.forEach(transaction => {
      const year = transaction.year.toString();
      const code = transaction.internalCode;
      if (!code || !years.includes(year)) return;
      
      // Handle code 600 (allocations)
      if (code === '600' || code === '0600') {
        if (result['F0600'] && result['F0600'][year]) {
          result['F0600'][year].allocated += transaction.amount;
          result['F0600'][year].count += 1;
        }
      }
      
      // Handle code 23152 (payments)
      if (code === '23152' || code === '023152') {
        if (result['F23152'] && result['F23152'][year]) {
          // Check if it's a payment or allocation based on transaction type
          if (transaction.transactionType?.includes('Zahlungen')) {
            result['F23152'][year].received += transaction.amount;
          } else {
            result['F23152'][year].allocated += transaction.amount;
          }
          result['F23152'][year].count += 1;
        }
      }
    });
    
    return result;
  }, [transactions, specialCategories, years]);
  
  // Calculate net balance (received minus allocated)
  const netBalance = useMemo(() => {
    const result: Record<string, number> = {};
    
    years.forEach(year => {
      // Sum up received payments across all payment categories
      const received = specialCategories
        .filter(c => c.categoryType === 'PAYMENT')
        .reduce((sum, category) => 
          sum + (specialTotals[category.code]?.[year]?.received || 0), 0);
      
      // Sum up normal spending (non-special categories)
      const spent = transactions
        .filter(t => t.year.toString() === year)
        .filter(t => {
          const category = categories.find(c => c.code === t.categoryCode);
          return category && !category.isSpecialCategory;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      result[year] = received - spent;
    });
    
    return result;
  }, [specialTotals, years, transactions, categories, specialCategories]);
  
  if (specialCategories.length === 0) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Special Category Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Category</th>
                {years.map(year => (
                  <th key={year} className="text-right p-2">{year}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specialCategories.map(category => (
                <React.Fragment key={category.id}>
                  <tr className="border-b bg-purple-50">
                    <td className="p-2 font-medium">{category.code} - {category.name}</td>
                    {years.map(year => (
                      <td key={year} className="p-2 text-right">
                        {specialTotals[category.code]?.[year]?.count || 0} transactions
                      </td>
                    ))}
                  </tr>
                  
                  {category.categoryType === 'ALLOCATION' && (
                    <tr className="border-b">
                      <td className="p-2 pl-6">Allocated</td>
                      {years.map(year => (
                        <td key={year} className="p-2 text-right">
                          {(specialTotals[category.code]?.[year]?.allocated || 0).toLocaleString('de-DE')} €
                        </td>
                      ))}
                    </tr>
                  )}
                  
                  {category.categoryType === 'PAYMENT' && (
                    <>
                      <tr className="border-b">
                        <td className="p-2 pl-6">Allocated</td>
                        {years.map(year => (
                          <td key={year} className="p-2 text-right">
                            {(specialTotals[category.code]?.[year]?.allocated || 0).toLocaleString('de-DE')} €
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 pl-6">Received</td>
                        {years.map(year => (
                          <td key={year} className="p-2 text-right">
                            {(specialTotals[category.code]?.[year]?.received || 0).toLocaleString('de-DE')} €
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                </React.Fragment>
              ))}
              
              {/* Net balance row */}
              <tr className="border-b bg-gray-100 font-bold">
                <td className="p-2">Net Balance (Received - Spent)</td>
                {years.map(year => (
                  <td key={year} className="p-2 text-right">
                    <span className={netBalance[year] >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {netBalance[year].toLocaleString('de-DE')} €
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}