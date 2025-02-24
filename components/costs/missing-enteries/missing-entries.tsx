import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { MissingChoices } from './missing-choices';
import { useFinanceStore } from '@/lib/store';
import type { Transaction, TransactionUpdate } from '@/types/transactions';
import type { Category } from '@/types/budget';
import { AskGerlindDialog } from './solution-dialog/ask-gerlind-dialog';

interface MissingEntriesListProps {
  transactions: Transaction[];
  categories: Category[];
  onTransactionUpdate: (transactionId: string, updates: TransactionUpdate) => void;
}

export function MissingEntriesList({ transactions, categories, onTransactionUpdate }: MissingEntriesListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { costs } = useFinanceStore();

  const isProperlyMapped = (transaction: Transaction): boolean => {
    // Include ELVI transactions
    if (transaction.internalCode === '600' || transaction.internalCode === '0600' || transaction.transactionType?.includes('ELVI')) {
      return false;
    }

    // Skip if no category code assigned
    if (!transaction.categoryCode) return true;
    
    // Skip if category not found
    const category = categories.find(c => c.code === transaction.categoryCode);
    if (!category) return true;

    // Include if category exists but not part of summary yet
    const isParent = categories.some(c => c.parentId === category.id);
    if (isParent) {
      const childCategories = categories.filter(c => c.parentId === category.id);
      return childCategories.some(child => child.code === transaction.categoryCode);
    }

    return true;
  };

  const missingEntries = useMemo(() => {
    if (!costs) return [];
    
    const allTransactions = [
      ...transactions,
      ...(costs.specialTransactions || [])
    ];
    
    return allTransactions.filter(transaction => !isProperlyMapped(transaction));
  }, [transactions, costs, categories]);

  const handleActionSelect = (transaction: Transaction, action: string) => {
    setSelectedTransaction(transaction);
    if (action === 'ask') {
      setDialogOpen(true);
    }
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '';
    try {
      if (typeof dateString === 'string') {
        return new Date(dateString).toLocaleDateString('de-DE');
      }
      return dateString.toLocaleDateString('de-DE');
    } catch (error) {
      console.error('Error formatting date:', dateString);
      return String(dateString);
    }
  };

  return (
    <Card className="p-4">
      <div className="text-red-600 mb-4">
        These transactions need proper category mapping 
        ({missingEntries.length} entries)
      </div>
      
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 w-32">Date</th>
            <th className="text-left p-2 w-32">Amount</th>
            <th className="text-left p-2 w-32">Category</th>
            <th className="text-left p-2 w-32">Reference</th>
            <th className="text-left p-2 w-32">Status</th>
            <th className="text-right p-2 w-40">Action</th>
          </tr>
        </thead>
        <tbody>
          {missingEntries.map((transaction) => (
            <tr key={transaction.id} className="border-b hover:bg-gray-50">
              <td className="p-2">
                {formatDate(transaction.bookingDate)}
              </td>
              <td className="p-2">
                {new Intl.NumberFormat('de-DE', { 
                  style: 'currency', 
                  currency: 'EUR' 
                }).format(transaction.amount)}
              </td>
              <td className="p-2">
                {transaction.internalCode === '0600' ? 'ELVI' : transaction.categoryCode}
              </td>
              <td className="p-2">{transaction.documentNumber}</td>
              <td className="p-2">
                {transaction.status || 'unprocessed'}
              </td>
              <td className="p-2 text-right">
                <MissingChoices 
                  onActionSelect={(action) => handleActionSelect(transaction, action)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AskGerlindDialog
        transaction={selectedTransaction}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}