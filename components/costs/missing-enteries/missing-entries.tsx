import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataTable } from "@/components/common/data-table/data-table";
import { MissingChoices, MissingActionType } from './missing-choices';
import { AskGerlindDialog } from './solution-dialog/ask-gerlind-dialog';
import { AssignCategoryDialog } from './solution-dialog/assign-category';
import { useMissingEntriesOperations } from '@/lib/hooks/useMissingEntriesOperations';
import { useInquiryOperations } from '@/lib/hooks/useInquiryOperations';
import { useTransactionOperations } from '@/lib/hooks/useTransactionOperations';
import { formatDate } from '@/lib/utils';
import { Info } from 'lucide-react';
import { toast } from "sonner";
import type { Transaction, TransactionUpdate, TransactionStatus } from '@/types/transactions';
import type { Category } from '@/types/budget';

interface MissingEntriesListProps {
  transactions: Transaction[];
  categories: Category[];
  onTransactionUpdate: (transactionId: string, updates: TransactionUpdate) => void;
}

export function MissingEntriesList({ 
  transactions, 
  categories, 
  onTransactionUpdate 
}: MissingEntriesListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [askDialogOpen, setAskDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  
  const { missingEntries, expandedRow, toggleRowExpand } = useMissingEntriesOperations(transactions, categories);
  const { fetchInquiries } = useInquiryOperations();
  const { updateTransactionCategory, fetchTransactions } = useTransactionOperations();

  const handleActionSelect = (transaction: Transaction, action: MissingActionType) => {
    setSelectedTransaction(transaction);
    
    if (action === 'ask') {
      setAskDialogOpen(true);
    } else if (action === 'paid') {
      handleTransactionStatus(transaction, 'completed');
    } else if (action === 'assign') {
      setAssignDialogOpen(true);
    }
  };
  
  const handleTransactionStatus = async (transaction: Transaction, status: TransactionStatus) => {
    try {
      await onTransactionUpdate(transaction.id, { status });
      toast.success(`Transaction marked as ${status}`);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction status');
    }
  };
  
  const handleAskDialogClose = () => {
    setAskDialogOpen(false);
    fetchInquiries();
  };

  const handleCategoryAssign = async (transactionId: string, categoryId: string, categoryCode: string) => {
    try {
      const category = categories.find(c => c.id === categoryId);
      if (!category) throw new Error('Category not found');
      
      await updateTransactionCategory(
        transactionId,
        categoryId,
        categoryCode,
        category.name
      );
      
      toast.success('Category assigned successfully');
      
      // Force refresh using our hook
      fetchTransactions();
    } catch (error) {
      console.error('Error assigning category:', error);
      toast.error('Failed to assign category');
    }
  };

  const renderStatusBadge = (status: string | undefined) => {
    if (!status || status === 'unprocessed') {
      return <Badge variant="outline">Unprocessed</Badge>;
    }
    
    if (status === 'pending_inquiry') {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Inquiry Sent</Badge>;
    }
    
    if (status === 'completed') {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
    }
    
    return <Badge variant="outline">{status}</Badge>;
  };

  const columns = [
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
      cell: (transaction: Transaction) => transaction.categoryCode || 
        <span className="bg-yellow-100 px-2 py-1 rounded text-sm">{transaction.internalCode}</span>
    },
    {
      key: 'reference',
      header: 'Reference',
      cell: (transaction: Transaction) => (
        <div className="truncate max-w-xs" title={transaction.personReference}>
          {transaction.personReference || '-'}
        </div>
      )
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
    },
    {
      key: 'status',
      header: 'Status',
      cell: (transaction: Transaction) => renderStatusBadge(transaction.status)
    },
    {
      key: 'action',
      header: 'Action',
      cell: (transaction: Transaction) => (
        <MissingChoices 
          onActionSelect={(action) => handleActionSelect(transaction, action)}
          disabled={transaction.status === 'pending_inquiry'}
        />
      )
    }
  ];

  const renderExpanded = (transaction: Transaction) => (
    <div className="p-3 border-b">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium mb-2">Transaction Details</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="text-gray-600">Project Code:</div>
            <div>{transaction.projectCode}</div>
            
            <div className="text-gray-600">Transaction Type:</div>
            <div>{transaction.transactionType}</div>
            
            <div className="text-gray-600">Internal Code:</div>
            <div>{transaction.internalCode}</div>
            
            <div className="text-gray-600">Cost Group:</div>
            <div>{transaction.costGroup}</div>
            
            <div className="text-gray-600">Year:</div>
            <div>{transaction.year}</div>
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-2">Additional Information</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="text-gray-600">Payment Partner:</div>
            <div>{transaction.paymentPartner || '-'}</div>
            
            <div className="text-gray-600">Invoice Date:</div>
            <div>{transaction.invoiceDate ? formatDate(transaction.invoiceDate) : '-'}</div>
            
            <div className="text-gray-600">Invoice Number:</div>
            <div>{transaction.invoiceNumber || '-'}</div>
            
            <div className="text-gray-600">Internal Account:</div>
            <div>{transaction.internalAccount || '-'}</div>
            
            <div className="text-gray-600">Account Label:</div>
            <div>{transaction.accountLabel || '-'}</div>
          </div>
        </div>
        <div className="col-span-2 mt-2 flex items-start gap-2 bg-blue-50 p-2 rounded text-sm">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p>Click on the row to collapse this detailed view. Use &quot;Assign Category&quot; to select the appropriate child category.</p>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="p-4">
      <div className="text-red-600 mb-4">
        These transactions need proper category mapping 
        ({missingEntries.length} entries)
      </div>
      
      {missingEntries.length === 0 ? (
        <Alert>
          <AlertDescription>No transactions requiring category mapping</AlertDescription>
        </Alert>
      ) : (
        <DataTable
          data={missingEntries}
          columns={columns}
          onRowClick={(transaction) => toggleRowExpand(transaction.id)}
          renderExpanded={renderExpanded}
          isRowExpanded={(transaction) => expandedRow === transaction.id}
          emptyMessage="No transactions requiring category mapping"
        />
      )}

      <AskGerlindDialog
        transaction={selectedTransaction}
        open={askDialogOpen}
        onOpenChange={handleAskDialogClose}
      />

      <AssignCategoryDialog
        transaction={selectedTransaction}
        categories={categories}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onCategoryAssign={handleCategoryAssign}
      />
    </Card>
  );
}