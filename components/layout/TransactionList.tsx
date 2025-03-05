// components/dashboard/TransactionList.tsx
import React, { useState } from 'react';
import { FilterBar } from '@/components/common/ui/filter-bar';
import { ActionButton } from '@/components/common/ui/action-button';
import { Search, RefreshCw, Edit, Trash2, FileText, Check, X, Users, ArrowUpDown, HelpCircle, FolderTree } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AskGerlindDialog } from "@/components/costs/missing-enteries/solution-dialog/ask-gerlind-dialog";
import { AssignCategoryDialog } from "@/components/costs/missing-enteries/solution-dialog/assign-category";
import type { Transaction } from '@/types/transactions';
import type { Category } from '@/types/budget';
import { Button } from '../ui/button';

interface TransactionListProps {
  transactions: Transaction[];
  categories?: Category[];
  onTransactionEdit?: (transaction: Transaction) => void;
  onTransactionDelete?: (transaction: Transaction) => void;
  onTransactionView?: (transaction: Transaction) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function TransactionList({ 
  transactions = [],
  categories = [],
  onTransactionEdit,
  onTransactionDelete,
  onTransactionView,
  onRefresh,
  isRefreshing = false,
  className = ''
}: TransactionListProps) {
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<keyof Transaction>('bookingDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [askGerlindOpen, setAskGerlindOpen] = useState(false);
  const [assignCategoryOpen, setAssignCategoryOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };
  
  const showTransactionDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailsOpen(true);
  };
  
  const handleAskGerlind = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setAskGerlindOpen(true);
  };
  
  const handleAssignCategory = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setAssignCategoryOpen(true);
  };

  // Filter and sort transactions
  const filteredTransactions = transactions.filter(transaction => {
    // Text filter
    const textMatch = filter === '' || 
      Object.values(transaction).some(value => 
        typeof value === 'string' && value.toLowerCase().includes(filter.toLowerCase())
      );
    
    // Status filter
    const statusMatch = statusFilter === 'all' || transaction.status === statusFilter;
    
    // Category filter
    const categoryMatch = categoryFilter === 'all' || transaction.categoryCode === categoryFilter;
    
    return textMatch && statusMatch && categoryMatch;
  }).sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'bookingDate') {
      comparison = new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
    } else if (sortField === 'amount') {
      comparison = a.amount - b.amount;
    } else if (sortField === 'categoryCode') {
      comparison = (a.categoryCode || '').localeCompare(b.categoryCode || '');
    } else if (sortField === 'personReference') {
      comparison = (a.personReference || '').localeCompare(b.personReference || '');
    } else {
      // For any other field, try to compare as strings
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      }
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Calculate totals
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Get unique categories for the filter dropdown
  const uniqueCategories = [...new Set(transactions.map(t => t.categoryCode).filter(Boolean))];
  
  // Status badge helper
  const renderStatusBadge = (status?: string) => {
    switch(status) {
      case 'processed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
            <Check size={12} className="mr-1" />
            Processed
          </span>
        );
      case 'missing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">
            <X size={12} className="mr-1" />
            Missing Category
          </span>
        );
      case 'pending_inquiry':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
            <HelpCircle size={12} className="mr-1" />
            Inquiry Sent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
            <X size={12} className="mr-1" />
            Unprocessed
          </span>
        );
    }
  };

  // Format date helper
  const formatDate = (date: Date | string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('de-DE');
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Transactions</h2>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <ActionButton
                onClick={handleRefresh}
                disabled={isRefreshing}
                loading={isRefreshing}
                icon={RefreshCw}
                label="Refresh"
                variant="outline"
                size="sm"
              />
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1">
            <FilterBar
              filter={filter}
              onFilterChange={setFilter}
              placeholder="Search transactions..."
              className="w-full"
            />
          </div>
          
          <div className="flex gap-2">
            <select 
              className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="processed">Processed</option>
              <option value="missing">Missing Category</option>
              <option value="pending_inquiry">Inquiry Sent</option>
              <option value="unprocessed">Unprocessed</option>
            </select>
            
            <select 
              className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(categoryCode => {
                const category = categories.find(c => c.code === categoryCode);
                return (
                  <option key={categoryCode} value={categoryCode || ''}>
                    {categoryCode} - {category?.name || 'Unknown'}
                  </option>
                );
              })}
            </select>
            
            <button 
              className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1"
              onClick={() => {
                setFilter('');
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
            >
              <X size={16} />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-4 flex justify-between items-center text-sm text-gray-600">
        <div>
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>
        <div className="font-medium">
          Total: {totalAmount.toLocaleString('de-DE')} €
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('bookingDate')}
              >
                <div className="flex items-center">
                  <span>Date</span>
                  {sortField === 'bookingDate' && (
                    <ArrowUpDown size={14} className="ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('categoryCode')}
              >
                <div className="flex items-center">
                  <span>Category</span>
                  {sortField === 'categoryCode' && (
                    <ArrowUpDown size={14} className="ml-1" />
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('personReference')}
              >
                <div className="flex items-center">
                  <span>Reference</span>
                  {sortField === 'personReference' && (
                    <ArrowUpDown size={14} className="ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end">
                  <span>Amount</span>
                  {sortField === 'amount' && (
                    <ArrowUpDown size={14} className="ml-1" />
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-sm text-center text-gray-500">
                  {filter || statusFilter !== 'all' || categoryFilter !== 'all' 
                    ? 'No transactions match your filters' 
                    : 'No transactions available'
                  }
                </td>
              </tr>
            ) : (
              filteredTransactions.map(transaction => {
                const category = categories.find(c => c.code === transaction.categoryCode);
                
                return (
                  <tr 
                    key={transaction.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => showTransactionDetails(transaction)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.bookingDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {transaction.categoryCode ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                          {transaction.categoryCode}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">
                          {transaction.internalCode}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {transaction.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {transaction.personReference || transaction.documentNumber || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                      <span className={transaction.amount < 0 ? 'text-red-600' : ''}>
                        {transaction.amount.toLocaleString('de-DE')} €
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {renderStatusBadge(transaction.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleAssignCategory(transaction)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Assign Category"
                        >
                          <FolderTree size={16} />
                        </button>
                        <button 
                          onClick={() => handleAskGerlind(transaction)}
                          className="text-amber-600 hover:text-amber-900"
                          title="Ask Gerlind"
                        >
                          <HelpCircle size={16} />
                        </button>
                        <button 
                          onClick={onTransactionDelete ? () => onTransactionDelete(transaction) : undefined}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {filteredTransactions.length > 10 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 text-sm">
          <div className="flex-1 flex justify-between sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Previous
            </button>
            <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{Math.min(filteredTransactions.length, 10)}</span> of <span className="font-medium">{filteredTransactions.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Previous</span>
                  <div className="h-5 w-5" aria-hidden="true">‹</div>
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  1
                </button>
                {filteredTransactions.length > 10 && (
                  <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                    2
                  </button>
                )}
                {filteredTransactions.length > 20 && (
                  <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                    3
                  </button>
                )}
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Next</span>
                  <div className="h-5 w-5" aria-hidden="true">›</div>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction Details Dialog */}
      {selectedTransaction && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm border p-3 rounded-md bg-gray-50">
                  <div className="font-semibold">Date:</div>
                  <div>{formatDate(selectedTransaction.bookingDate)}</div>
                  
                  <div className="font-semibold">Amount:</div>
                  <div>{selectedTransaction.amount.toLocaleString('de-DE')} €</div>
                  
                  <div className="font-semibold">Category:</div>
                  <div>{selectedTransaction.categoryCode || selectedTransaction.internalCode}</div>
                  
                  <div className="font-semibold">Status:</div>
                  <div>{selectedTransaction.status || 'unprocessed'}</div>
                  
                  <div className="font-semibold">Reference:</div>
                  <div>{selectedTransaction.documentNumber || '-'}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Additional Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm border p-3 rounded-md bg-gray-50">
                  <div className="font-semibold">Description:</div>
                  <div>{selectedTransaction.description}</div>
                  
                  <div className="font-semibold">Person Reference:</div>
                  <div>{selectedTransaction.personReference || '-'}</div>
                  
                  <div className="font-semibold">Project Code:</div>
                  <div>{selectedTransaction.projectCode}</div>
                  
                  <div className="font-semibold">Year:</div>
                  <div>{selectedTransaction.year}</div>
                  
                  <div className="font-semibold">Transaction Type:</div>
                  <div>{selectedTransaction.transactionType}</div>
                </div>
              </div>
              
              <div className="col-span-2 space-y-2">
                <h3 className="font-medium text-gray-900">Extended Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm border p-3 rounded-md bg-gray-50 md:grid-cols-4">
                  <div className="font-semibold">Cost Group:</div>
                  <div>{selectedTransaction.costGroup || '-'}</div>
                  
                  <div className="font-semibold">Internal Code:</div>
                  <div>{selectedTransaction.internalCode}</div>
                  
                  <div className="font-semibold">Invoice Date:</div>
                  <div>{selectedTransaction.invoiceDate ? formatDate(selectedTransaction.invoiceDate) : '-'}</div>
                  
                  <div className="font-semibold">Invoice Number:</div>
                  <div>{selectedTransaction.invoiceNumber || '-'}</div>
                  
                  <div className="font-semibold">Payment Partner:</div>
                  <div>{selectedTransaction.paymentPartner || '-'}</div>
                  
                  <div className="font-semibold">Internal Account:</div>
                  <div>{selectedTransaction.internalAccount || '-'}</div>
                  
                  <div className="font-semibold">Account Label:</div>
                  <div>{selectedTransaction.accountLabel || '-'}</div>
                  
                  <div className="font-semibold">Details:</div>
                  <div>{selectedTransaction.details || '-'}</div>
                </div>
              </div>
              
              <div className="col-span-2 flex justify-end space-x-4 mt-4">
                <Button 
                  variant="outline"
                  onClick={() => handleAssignCategory(selectedTransaction)}
                >
                  <FolderTree size={16} className="mr-2" />
                  Assign Category
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleAskGerlind(selectedTransaction)}
                >
                  <HelpCircle size={16} className="mr-2" />
                  Ask Gerlind
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Ask Gerlind Dialog */}
      {selectedTransaction && (
        <AskGerlindDialog
          transaction={selectedTransaction}
          open={askGerlindOpen}
          onOpenChange={setAskGerlindOpen}
        />
      )}
      
      {/* Assign Category Dialog */}
      {selectedTransaction && (
        <AssignCategoryDialog
          transaction={selectedTransaction}
          categories={categories}
          open={assignCategoryOpen}
          onOpenChange={setAssignCategoryOpen}
        />
      )}
    </div>
  );
}