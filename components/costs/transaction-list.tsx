import React from 'react';
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataTable } from "@/components/common/data-table/data-table";
import { FilterBar } from '@/components/common/ui/filter-bar';
import { Euro } from 'lucide-react';
import { useFilterSort } from '@/lib/hooks/useFilterSort';
import { formatDate } from '@/lib/utils';
import type { Transaction } from '@/types/transactions';
import type { Category } from '@/types/budget';

interface TransactionListProps {
  initialTransactions?: Transaction[];
  categories: Category[];
  isSpecial?: boolean;
  isWarning?: boolean;
  warningMessage?: string;
  onTransactionClick?: (transaction: Transaction) => void;
}

export function TransactionList({ 
  initialTransactions = [], 
  categories, 
  isSpecial = false, 
  isWarning = false, 
  warningMessage,
  onTransactionClick
}: TransactionListProps) {
  const { 
    filter, 
    setFilter, 
    sortConfig, 
    handleSort, 
    filteredAndSortedItems: filteredTransactions 
  } = useFilterSort<Transaction>(initialTransactions, { key: 'bookingDate', direction: 'desc' });

  const isMatchingSummaryCategory = (transaction: Transaction): boolean => {
    const category = categories.find(c => c.code === transaction.categoryCode);
    if (!category) return false;

    const isParent = categories.some(c => c.parentId === category.id);
    if (!isParent) return true;

    const childCategories = categories.filter(c => c.parentId === category.id);
    return childCategories.some(child => child.code === transaction.categoryCode);
  };

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  const columns = [
    {
      key: 'date',
      header: 'Date',
      cell: (transaction: Transaction) => formatDate(transaction.bookingDate),
      sortable: true
    },
    {
      key: 'category',
      header: isSpecial ? 'Type' : 'Category',
      cell: (transaction: Transaction) => isSpecial ? 
        `${transaction.transactionType} (${transaction.internalCode})` : 
        (transaction.categoryCode || 
          <span className="bg-yellow-100 px-2 py-1 rounded">{transaction.internalCode}</span>
        ),
      sortable: true
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (transaction: Transaction) => (
        <span className={transaction.amount < 0 ? 'text-red-600' : ''}>
          {transaction.amount.toLocaleString('de-DE')} €
        </span>
      ),
      sortable: true
    },
    {
      key: 'reference',
      header: 'Reference',
      cell: (transaction: Transaction) => (
        <div className="truncate max-w-xs" title={transaction.personReference}>
          {transaction.personReference || '-'}
        </div>
      ),
      sortable: true
    },
    {
      key: 'details',
      header: 'Details',
      cell: (transaction: Transaction) => (
        <div className="truncate max-w-xs" title={transaction.details}>
          {transaction.details || '-'}
        </div>
      )
    },
    {
      key: 'document',
      header: 'Document',
      cell: (transaction: Transaction) => transaction.documentNumber || '-'
    }
  ];

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Showing {filteredTransactions.length} transactions
            {filter ? ` matching "${filter}"` : ''}
          </AlertDescription>
        </Alert>

        <div className="flex justify-between items-center">
          <FilterBar
            filter={filter}
            onFilterChange={setFilter}
            onSort={key => handleSort(key as keyof Transaction)}
            sortFields={[
              { key: 'bookingDate', label: 'Date' },
              { key: 'amount', label: 'Amount' },
              { key: isSpecial ? 'transactionType' : 'categoryCode', label: isSpecial ? 'Type' : 'Category' },
              { key: 'personReference', label: 'Reference' }
            ]}
            placeholder="Search transactions..."
            className="flex-1"
          />
          
          <div className="flex items-center ml-4 text-sm text-gray-500">
            <Euro className="h-4 w-4 mr-1" />
            Total: <span className="font-bold ml-1">
              {totalAmount.toLocaleString('de-DE')} €
            </span>
          </div>
        </div>

        {isWarning && warningMessage && (
          <Alert variant="destructive">
            <AlertDescription>{warningMessage}</AlertDescription>
          </Alert>
        )}

        <DataTable
          data={filteredTransactions}
          columns={columns}
          onRowClick={onTransactionClick}
          rowClassName={(transaction) => 
            !isSpecial && isMatchingSummaryCategory(transaction) ? 'bg-green-50' : ''
          }
          onSort={handleSort}
          sortKey={sortConfig.key.toString()}
          sortDirection={sortConfig.direction}
          emptyMessage="No transactions found matching your criteria"
        />
      </div>
    </Card>
  );
}