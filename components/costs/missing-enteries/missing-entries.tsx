import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { MissingChoices } from './missing-choices';
import { useFinanceStore } from '@/lib/store';
import { Badge } from "@/components/ui/badge";
import { formatDate } from '@/lib/utils';
import { toast } from "sonner";
import { Info } from 'lucide-react';
import type { Transaction, TransactionUpdate } from '@/types/transactions';
import type { Category } from '@/types/budget';
import { AskGerlindDialog } from './solution-dialog/ask-gerlind-dialog';
import { AssignCategoryDialog } from './solution-dialog/assign-category';


interface MissingEntriesListProps {
  transactions: Transaction[];
  categories: Category[];
  onTransactionUpdate: (transactionId: string, updates: TransactionUpdate) => void;
}

export function MissingEntriesList({ transactions, categories, onTransactionUpdate }: MissingEntriesListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [askDialogOpen, setAskDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { fetchInquiries } = useFinanceStore();

  // Extract from components/budget/missing-entries.tsx
const isProperlyMapped = (transaction: Transaction): boolean => {
  // Check metadata for explicit flags
  const metadata = transaction.metadata as any || {};
  if (metadata.needsReview === true) {
    console.log(`Transaction ${transaction.id} has needsReview flag in metadata`);
    return false;
  }
  
  // If no categoryId, transaction needs mapping (unless it's a special numeric code)
  if (!transaction.categoryId) {
    // Handle special numeric codes (600, 23152) that should be preserved
    if (/^0*(600|23152)$/.test(transaction.internalCode)) {
      // These codes are valid on their own - check if they're already properly tracked
      if (transaction.status === 'completed') {
        return true;
      }
      
      // Allow user to properly set status for these special codes
      console.log(`Transaction ${transaction.id} has special code ${transaction.internalCode} - needs status review`);
      return false;
    }
    
    // For all other numeric codes without a category, consider them unmapped
    console.log(`Transaction ${transaction.id} has no categoryId - needs mapping`);
    return false;
  }
  
  // Check if there's a valid category code with F prefix
  if (!transaction.categoryCode || !transaction.categoryCode.startsWith('F')) {
    console.log(`Transaction ${transaction.id} missing proper F-prefixed category code - needs mapping`);
    return false;
  }
  
  // Verify the category exists
  const category = categories.find(c => c.code === transaction.categoryCode);
  if (!category) {
    console.log(`Transaction ${transaction.id} has category code ${transaction.categoryCode} that doesn't exist in categories list`);
    return false;
  }

  // Check if it's a parent category that needs child selection
  const isParent = categories.some(c => c.parentId === category.id);
  if (!isParent) {
    // It's a leaf category, properly mapped
    return true;
  }

  // If parent, check we've selected a child
  const childCategories = categories.filter(c => c.parentId === category.id);
  const result = childCategories.some(child => child.code === transaction.categoryCode);
  
  if (!result) {
    console.log(`Transaction ${transaction.id} has parent category ${transaction.categoryCode} but needs child category assignment`);
  }
  
  return result;
};

  const missingEntries = useMemo(() => {
    return transactions.filter(transaction => !isProperlyMapped(transaction));
  }, [transactions, categories]);

  const handleActionSelect = (transaction: Transaction, action: string) => {
    setSelectedTransaction(transaction);
    
    if (action === 'ask') {
      setAskDialogOpen(true);
    } else if (action === 'paid') {
      handleTransactionStatus(transaction, 'completed');
    } else if (action === 'assign') {
      setAssignDialogOpen(true);
    }
  };
  
  const handleTransactionStatus = async (transaction: Transaction, status: string) => {
    try {
      await onTransactionUpdate(transaction.id, { status: status as any });
      toast.success(`Transaction marked as ${status}`);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction status');
    }
  };
  
  const handleAskDialogClose = () => {
    setAskDialogOpen(false);
    // Refresh inquiries when the dialog is closed
    fetchInquiries();
  };

  const handleCategoryAssign = async (transactionId: string, categoryId: string, categoryCode: string) => {
    try {
      // Get category details
      const category = categories.find(c => c.id === categoryId);
      if (!category) throw new Error('Category not found');
      
      // Use the store function instead of direct API calls
      const financeStore = useFinanceStore.getState();
      await financeStore.updateTransactionCategory(
        transactionId,
        categoryId,
        categoryCode,
        category.name
      );
      
      toast.success('Category assigned successfully');
      
      // Force refresh to update the UI
      financeStore.fetchTransactions();
    } catch (error) {
      console.error('Error assigning category:', error);
      toast.error('Failed to assign category');
    }
  };

  const toggleRowExpand = (transactionId: string) => {
    if (expandedRow === transactionId) {
      setExpandedRow(null);
    } else {
      setExpandedRow(transactionId);
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

  return (
    <Card className="p-4">
      <div className="text-red-600 mb-4">
        These transactions need proper category mapping 
        ({missingEntries.length} entries)
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Amount</th>
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">Reference</th>
              <th className="text-left p-2">Details</th>
              <th className="text-left p-2">Document</th>
              <th className="text-left p-2">Status</th>
              <th className="text-right p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {missingEntries.map((transaction) => (
              <React.Fragment key={transaction.id}>
                <tr 
                  className={`border-b hover:bg-gray-50 ${expandedRow === transaction.id ? 'bg-gray-50' : ''}`}
                  onClick={() => toggleRowExpand(transaction.id)}
                >
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
                    {transaction.categoryCode || 
                      <span className="bg-yellow-100 px-2 py-1 rounded text-sm">{transaction.internalCode}</span>
                    }
                  </td>
                  <td className="p-2 truncate max-w-xs" title={transaction.personReference}>
                    {transaction.personReference || '-'}
                  </td>
                  <td className="p-2 truncate max-w-xs" title={transaction.details}>
                    {transaction.details || '-'}
                  </td>
                  <td className="p-2">
                    {transaction.documentNumber || '-'}
                  </td>
                  <td className="p-2">
                    {renderStatusBadge(transaction.status)}
                  </td>
                  <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <MissingChoices 
                      onActionSelect={(action) => handleActionSelect(transaction, action)}
                      disabled={transaction.status === 'pending_inquiry'}
                    />
                  </td>
                </tr>
                {expandedRow === transaction.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={8} className="p-3 border-b">
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
                          <p>Click on the row to collapse this detailed view. Use "Assign Category" to select the appropriate child category.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {missingEntries.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  No transactions requiring category mapping
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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