'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

import { useFinanceStore } from '@/lib/store';
import { Transaction } from '@/types/transactions';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransactionDetails } from '@/components/costs/tabbed-transaction';
import { BudgetSummary } from '@/components/budget/budget-summary';

export default function DashboardPage() {
  const { categories, costs, reset: resetStore } = useFinanceStore();
  const [isLoading, setIsLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [inspectData, setInspectData] = useState<{
    transactions: Transaction[];
    categoryCode: string;
    year: string | number;
  } | null>(null);
  
  // One-time initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Fetch data directly from API
        const catResponse = await fetch('/api/categories');
        const categoriesData = await catResponse.json();
        
        const transResponse = await fetch('/api/transactions');
        const transData = await transResponse.json();
        const transactions = transData.transactions || [];
        
        // Update state
        if (transactions.length > 0) {
          const sorted = [...transactions].sort(
            (a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()
          );
          setRecentTransactions(sorted.slice(0, 5));
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, []); // Empty dependency array - run once
  
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Fetch data directly from API
      const catResponse = await fetch('/api/categories');
      const categoriesData = await catResponse.json();
      
      const transResponse = await fetch('/api/transactions');
      const transData = await transResponse.json();
      const transactions = transData.transactions || [];
      
      // Update recent transactions
      if (transactions.length > 0) {
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
  
  const handleCellClick = (amount: number, year: string | number, categoryCode: string) => {
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