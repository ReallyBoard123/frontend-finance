// app/dashboard/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useFinanceStore } from '@/lib/store';
import { useCategoryOperations } from '@/lib/hooks/useCategoryOperations';
import { useTransactionOperations } from '@/lib/hooks/useTransactionOperations';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransactionDetails } from '@/components/costs/tabbed-transaction';
import { BudgetSummary } from '@/components/budget/budget-summary';
import type { Transaction } from '@/types/transactions';

export default function DashboardPage() {
  const { categories, costs, setCosts } = useFinanceStore();
  const { fetchCategories } = useCategoryOperations();
  const { calculateYearlyTotals } = useTransactionOperations();
  
  const [isLoading, setIsLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [inspectData, setInspectData] = useState<{
    transactions: Transaction[];
    categoryCode: string;
    year: string | number;
  } | null>(null);
  
  // Track if initial data has been loaded
  const initialLoadComplete = useRef(false);
  
  // One-time initial data load
  useEffect(() => {
    // Only run this effect once
    if (initialLoadComplete.current) return;
    
    const loadInitialData = async () => {
      // If we already have both categories and transaction data, don't reload
      if (categories.length > 0 && (costs?.transactions?.length ?? 0) > 0) {
        initialLoadComplete.current = true;
        return;
      }
      
      setIsLoading(true);
      try {
        // Fetch categories first if not already loaded
        let currentCategories = categories;
        if (categories.length === 0) {
          await fetchCategories();
          // After fetchCategories, the store is updated
          currentCategories = useFinanceStore.getState().categories;
        }
        
        // Fetch transactions if needed
        if (!costs?.transactions || costs.transactions.length === 0) {
          const response = await fetch('/api/transactions');
          const data = await response.json();
          const transactions = data.transactions || [];
          
          // Update recent transactions
          if (transactions.length > 0) {
            const sorted = [...transactions].sort(
              (a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()
            );
            setRecentTransactions(sorted.slice(0, 5));
            
            // Calculate yearly totals and update costs
            const yearlyTotals = calculateYearlyTotals(transactions, currentCategories);
            setCosts({
              transactions,
              specialTransactions: [], // We'll handle these separately if needed
              yearlyTotals
            });
          }
        }
        
        initialLoadComplete.current = true;
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, []);  // Empty dependency array ensures this runs once
  
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Reload categories
      await fetchCategories();
      const currentCategories = useFinanceStore.getState().categories;
      
      // Reload transactions and recalculate
      const response = await fetch('/api/transactions');
      const data = await response.json();
      const transactions = data.transactions || [];
      
      if (transactions.length > 0) {
        const yearlyTotals = calculateYearlyTotals(transactions, currentCategories);
        setCosts({
          transactions,
          specialTransactions: [], 
          yearlyTotals
        });
        
        const sorted = [...transactions].sort(
          (a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()
        );
        setRecentTransactions(sorted.slice(0, 5));
      }
      
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExport = async () => {
    try {
      const response = await fetch('/api/export');
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transactions-export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };
  
  const handleCellClick = (amount: number, year: number | string, categoryCode: string) => {
    if (!costs?.transactions) return;
    
    const matchingTransactions = costs.transactions.filter(
      t => t.categoryCode === categoryCode && t.year.toString() === year.toString()
    );
    
    setInspectData({
      transactions: matchingTransactions,
      categoryCode,
      year
    });
  };
  
  const closeInspectDialog = () => {
    setInspectData(null);
  };

  return (
    <DashboardLayout 
      title="Financial Dashboard" 
      onRefresh={handleRefresh}
      onExport={handleExport}
      isRefreshing={isLoading}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <BudgetSummary 
            categories={categories}
            yearlyTotals={costs?.yearlyTotals || {}}
            isInspectMode={true}
            onCellClick={handleCellClick}
            onRefresh={handleRefresh}
          />
        </div>
      </div>
      
      {/* Inspect Mode Dialog */}
      <Dialog open={!!inspectData} onOpenChange={closeInspectDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Transactions for {inspectData?.categoryCode} ({inspectData?.year})
            </DialogTitle>
          </DialogHeader>
          {inspectData && (
            <TransactionDetails 
              transactions={inspectData.transactions}
              categoryCode={inspectData.categoryCode}
              year={Number(inspectData.year)}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}