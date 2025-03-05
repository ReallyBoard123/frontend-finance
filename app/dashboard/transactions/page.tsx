'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useFinanceStore } from '@/lib/store';
import { toast } from 'sonner';
import type { Transaction } from '@/types/transactions';
import { TransactionList } from '@/components/layout/TransactionList';

export default function TransactionsPage() {
  const { categories } = useFinanceStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Direct API calls to avoid hooks that might cause infinite loops
        const response = await fetch('/api/transactions');
        const data = await response.json();
        setTransactions(data.transactions || []);
      } catch (error) {
        console.error('Error loading transaction data:', error);
        toast.error('Failed to load transactions');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/transactions');
      const data = await response.json();
      setTransactions(data.transactions || []);
      toast.success('Transactions refreshed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh transactions');
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
      
      toast.success('Transactions exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export transactions');
    }
  };
  
  const handleTransactionView = (transaction: Transaction) => {
    toast.info(`Viewing transaction: ${transaction.description}`);
  };
  
  const handleTransactionEdit = (transaction: Transaction) => {
    toast.info(`Editing transaction: ${transaction.description}`);
  };
  
  const handleTransactionDelete = (transaction: Transaction) => {
    toast.info(`Deleting transaction: ${transaction.description}`);
  };

  return (
    <DashboardLayout 
      title="Transaction Management" 
      onRefresh={handleRefresh}
      onExport={handleExport}
      isRefreshing={isLoading}
    >
      <div className="space-y-6">
        <TransactionList 
          transactions={transactions}
          categories={categories}
          onRefresh={handleRefresh}
          isRefreshing={isLoading}
          onTransactionView={handleTransactionView}
          onTransactionEdit={handleTransactionEdit}
          onTransactionDelete={handleTransactionDelete}
        />
      </div>
    </DashboardLayout>
  );
}