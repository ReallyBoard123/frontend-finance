// components/layout/TransactionList.tsx
import React, { useState, useEffect } from 'react';
import { FilterBar } from '@/components/common/ui/filter-bar';
import { StatusBadge } from '@/components/common/ui/status-badge';
import { ActionButton } from '@/components/common/ui/action-button';
import { Search, RefreshCw, Edit, Trash2, FileText, ArrowUpDown, HelpCircle, FolderTree, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AskGerlindDialog } from "@/components/costs/missing-enteries/solution-dialog/ask-gerlind-dialog";
import { AssignCategoryDialog } from "@/components/costs/missing-enteries/solution-dialog/assign-category";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Transaction, TransactionStatus } from '@/types/transactions';
import type { Category } from '@/types/budget';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";

interface TransactionListProps {
  transactions?: Transaction[];
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
  const [activeTab, setActiveTab] = useState('all');
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [specialTransactions, setSpecialTransactions] = useState<Transaction[]>([]);
  const [missingTransactions, setMissingTransactions] = useState<Transaction[]>([]);
  
  // Fetch all transaction types on mount
  useEffect(() => {
    const fetchAllTransactionTypes = async () => {
      if (transactions.length > 0) {
        // If transactions were passed as props, categorize them
        categorizeTransactions(transactions);
      } else {
        try {
          // Otherwise fetch from API
          const [regularRes, specialRes] = await Promise.all([
            fetch('/api/transactions?type=regular'),
            fetch('/api/transactions?type=special')
          ]);
          
          const [regular, special] = await Promise.all([
            regularRes.json(),
            specialRes.json()
          ]);
          
          const allFetchedTransactions = [
            ...(regular.transactions || []),
            ...(special.transactions || [])
          ];
          
          categorizeTransactions(allFetchedTransactions);
        } catch (error) {
          console.error('Error fetching transactions:', error);
          toast.error('Failed to load all transaction types');
        }
      }
    };
    
    fetchAllTransactionTypes();
  }, [transactions]);
  
  // Function to categorize transactions by status
  const categorizeTransactions = (txs: Transaction[]) => {
    setAllTransactions(txs);
    
    // Special transactions
    const special = txs.filter(t => 
      t.requiresSpecialHandling || (t.status === 'special' as TransactionStatus)
    );
    setSpecialTransactions(special);
    
    // Missing transactions (no categoryId or 'missing' status)
    const missing = txs.filter(t => 
      t.status === 'missing' || 
      (!t.categoryId && t.status !== ('special' as TransactionStatus) && !t.requiresSpecialHandling)
    );
    setMissingTransactions(missing);
  };
  
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

  // Get transactions based on active tab
  const getActiveTransactions = () => {
    switch (activeTab) {
      case 'special':
        return specialTransactions;
      case 'missing':
        return missingTransactions;
      default:
        return allTransactions;
    }
  };

  // Filter and sort transactions
  const filteredTransactions = getActiveTransactions().filter(transaction => {
    // Text filter
    const textMatch = filter === '' || 
      Object.values(transaction).some(value => 
        typeof value === 'string' && value.toLowerCase().includes(filter.toLowerCase())
      );
    
    // Status filter (only apply if not 'all')
    const statusMatch = statusFilter === 'all' || transaction.status === statusFilter;
    
    // Category filter (only apply if not 'all')
    const categoryMatch = categoryFilter === 'all' || transaction.categoryCode === categoryFilter;
    
    return textMatch && statusMatch && categoryMatch;
  }).sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'bookingDate') {
      const aDate = new Date(a.bookingDate);
      const bDate = new Date(b.bookingDate);
      comparison = aDate.getTime() - bDate.getTime();
    } else if (sortField === 'amount') {
      comparison = a.amount - b.amount;
    } else if (sortField === 'categoryCode') {
      const aCode = a.categoryCode || '';
      const bCode = b.categoryCode || '';
      comparison = aCode.localeCompare(bCode);
    } else if (sortField === 'personReference') {
      const aRef = a.personReference || '';
      const bRef = b.personReference || '';
      comparison = aRef.localeCompare(bRef);
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
  const uniqueCategories = [...new Set(allTransactions.map(t => t.categoryCode).filter(Boolean))];
  
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
        
        {/* Transaction type tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="all">
              All Transactions ({allTransactions.length})
            </TabsTrigger>
            <TabsTrigger value="special">
              Special ({specialTransactions.length})
            </TabsTrigger>
            <TabsTrigger value="missing">
              Missing ({missingTransactions.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
              <option value="special">Special</option>
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
          Showing {filteredTransactions.length} of {getActiveTransactions().length} transactions
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
                const status = transaction.status as TransactionStatus || 'unprocessed';
                
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
                      <StatusBadge status={status} />
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
              
              {/* Additional transaction details would go here */}
            </div>
            
            <div className="flex justify-end gap-4 mt-4">
              <Button
                variant="outline"
                onClick={() => handleAssignCategory(selectedTransaction)}
              >
                <FolderTree className="h-4 w-4 mr-2" />
                Assign Category
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleAskGerlind(selectedTransaction)}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Ask Gerlind
              </Button>
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