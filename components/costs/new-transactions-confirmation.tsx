import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/common/data-table/data-table";
import { ActionButton } from '@/components/common/ui/action-button';
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate } from '@/lib/utils';
import { CheckCircle, XCircle } from 'lucide-react';
import type { Transaction } from '@/types/transactions';
import type { Category } from '@/types/budget';

interface NewTransactionsConfirmationProps {
  newTransactions: Transaction[];
  categories: Category[];
  onConfirm: (selectedTransactions: Transaction[]) => void;
  onCancel: () => void;
}

export function NewTransactionsConfirmation({ 
  newTransactions, 
  categories,
  onConfirm, 
  onCancel 
}: NewTransactionsConfirmationProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(newTransactions.map(t => t.id)));
  
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(newTransactions.map(t => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };
  
  const columns = [
    {
      key: 'select',
      header: 'Select',
      cell: (transaction: Transaction) => (
        <Checkbox 
          checked={selectedIds.has(transaction.id)} 
          onCheckedChange={() => toggleSelection(transaction.id)}
        />
      )
    },
    {
      key: 'date',
      header: 'Date',
      cell: (transaction: Transaction) => formatDate(transaction.bookingDate)
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (transaction: Transaction) => new Intl.NumberFormat('de-DE', { 
        style: 'currency', 
        currency: 'EUR' 
      }).format(transaction.amount)
    },
    {
      key: 'category',
      header: 'Category',
      cell: (transaction: Transaction) => {
        const categoryCode = transaction.categoryCode || 
          (transaction.internalCode ? `F${transaction.internalCode.padStart(4, '0')}` : '');
        return categoryCode;
      }
    },
    {
      key: 'reference',
      header: 'Reference',
      cell: (transaction: Transaction) => transaction.personReference || '-'
    },
    {
      key: 'document',
      header: 'Document',
      cell: (transaction: Transaction) => transaction.documentNumber || '-'
    }
  ];

  const selectedTransactions = newTransactions.filter(t => selectedIds.has(t.id));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>New Transactions ({newTransactions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          data={newTransactions}
          columns={columns}
          emptyMessage="No new transactions found"
        />
        
        <div className="flex justify-end gap-4 mt-6">
          <ActionButton
            onClick={onCancel}
            label="Cancel"
            icon={XCircle}
            variant="outline"
          />
          <ActionButton
            onClick={() => onConfirm(selectedTransactions)}
            label={`Save ${selectedIds.size} Transactions`}
            icon={CheckCircle}
            disabled={selectedIds.size === 0}
          />
        </div>
      </CardContent>
    </Card>
  );
}