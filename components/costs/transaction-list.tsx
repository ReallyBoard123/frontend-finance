import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, SortAsc, Euro } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Transaction } from '@/types/transactions';
import type { Category } from '@/types/budget';

interface TransactionListProps {
  initialTransactions?: Transaction[];
  categories: Category[];
  isSpecial?: boolean;
  isWarning?: boolean;
  warningMessage?: string;
}

type SortKey = 'date' | 'amount' | 'category' | 'reference';

export function TransactionList({ 
  initialTransactions, 
  categories, 
  isSpecial = false, 
  isWarning = false, 
  warningMessage 
}: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [count, setCount] = useState(0);
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: 'asc' | 'desc';
  }>({
    key: 'date',
    direction: 'desc'
  });

  useEffect(() => {
    if (initialTransactions) {
      setTransactions(initialTransactions);
      setCount(initialTransactions.length);
    } else {
      const fetchTransactions = async () => {
        try {
          const response = await fetch(`/api/transactions${isSpecial ? '?type=special' : ''}`);
          const data = await response.json();
          setTransactions(data.transactions || []);
          setCount(data.count || 0);
        } catch (error) {
          console.error('Error fetching transactions:', error);
        }
      };
      fetchTransactions();
    }
  }, [isSpecial, initialTransactions]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(
      transactions.map(t => isSpecial ? t.transactionType : (t.categoryCode || t.internalCode))
    );
    return Array.from(categories).sort();
  }, [transactions, isSpecial]);

  const uniqueYears = useMemo(() => {
    const years = new Set(transactions.map(t => t.year));
    return Array.from(years).sort();
  }, [transactions]);

  const isMatchingSummaryCategory = (transaction: Transaction): boolean => {
    const category = categories.find(c => c.code === transaction.categoryCode);
    if (!category) return false;

    const isParent = categories.some(c => c.parentId === category.id);
    if (!isParent) return true;

    const childCategories = categories.filter(c => c.parentId === category.id);
    return childCategories.some(child => child.code === transaction.categoryCode);
  };

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions;

    if (filter) {
      const searchTerm = filter.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm) ||
        t.details?.toLowerCase().includes(searchTerm) ||
        t.personReference?.toLowerCase().includes(searchTerm) ||
        t.documentNumber?.toLowerCase().includes(searchTerm)
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(t => 
        isSpecial ? 
          t.transactionType === categoryFilter :
          (t.categoryCode || t.internalCode) === categoryFilter
      );
    }

    if (yearFilter !== "all") {
      filtered = filtered.filter(t => t.year.toString() === yearFilter);
    }

    return filtered.sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.key) {
        case 'date':
          return (new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()) * direction;
        case 'amount':
          return (a.amount - b.amount) * direction;
        case 'category':
          const aCategory = isSpecial ? a.transactionType : (a.categoryCode || a.internalCode);
          const bCategory = isSpecial ? b.transactionType : (b.categoryCode || b.internalCode);
          return aCategory.localeCompare(bCategory) * direction;
        case 'reference':
          return (a.personReference || '').localeCompare(b.personReference || '') * direction;
        default:
          return 0;
      }
    });
  }, [transactions, filter, categoryFilter, yearFilter, sortConfig, isSpecial]);

  const totalAmount = useMemo(() => {
    return filteredAndSortedTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredAndSortedTransactions]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            {initialTransactions ? 
              `Showing ${count} transactions from uploaded file` :
              `Loaded ${count} transactions from database`}
          </AlertDescription>
        </Alert>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search transactions..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {uniqueYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isWarning && warningMessage && (
          <Alert variant="destructive">
            <AlertDescription>{warningMessage}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSort('date')}
              className={sortConfig.key === 'date' ? 'bg-gray-100' : ''}
            >
              <SortAsc className="h-4 w-4 mr-1" />
              Date
            </Button>
            <Button 
              variant="outline"
              size="sm" 
              onClick={() => handleSort('amount')}
              className={sortConfig.key === 'amount' ? 'bg-gray-100' : ''}
            >
              <Euro className="h-4 w-4 mr-1" />
              Amount
            </Button>
            <Button 
              variant="outline"
              size="sm" 
              onClick={() => handleSort('category')}
              className={sortConfig.key === 'category' ? 'bg-gray-100' : ''}
            >
              <SortAsc className="h-4 w-4 mr-1" />
              Category
            </Button>
            <Button 
              variant="outline"
              size="sm" 
              onClick={() => handleSort('reference')}
              className={sortConfig.key === 'reference' ? 'bg-gray-100' : ''}
            >
              <SortAsc className="h-4 w-4 mr-1" />
              Reference
            </Button>
          </div>
          <div className="text-sm text-gray-500">
            Total: <span className="font-bold">{totalAmount.toLocaleString('de-DE')} €</span>
          </div>
        </div>

        {filteredAndSortedTransactions.length === 0 ? (
          <Alert>
            <AlertDescription>
              No transactions found matching your criteria
            </AlertDescription>
          </Alert>
        ) : (
          <div className="border rounded-lg">
            <div className="grid grid-cols-6 gap-4 p-2 bg-gray-50 font-medium">
              <div>Date</div>
              <div>{isSpecial ? 'Type' : 'Category'}</div>
              <div>Amount</div>
              <div>Reference</div>
              <div>Details</div>
              <div>Document</div>
            </div>
            <div className="divide-y">
              {filteredAndSortedTransactions.map((t, idx) => (
                <div 
                  key={idx} 
                  className={`grid grid-cols-6 gap-4 p-2 hover:bg-gray-50 ${
                    !isSpecial && isMatchingSummaryCategory(t) ? 'bg-green-50' : ''
                  }`}
                >
                  <div>{new Date(t.bookingDate).toLocaleDateString('de-DE')}</div>
                  <div>
                    {isSpecial ? 
                      `${t.transactionType} (${t.internalCode})` : 
                      (t.categoryCode || <span className="bg-yellow-100 px-2 py-1 rounded">{t.internalCode}</span>)
                    }
                  </div>
                  <div className={`${t.amount < 0 ? 'text-red-600' : ''}`}>
                    {t.amount.toLocaleString('de-DE')} €
                  </div>
                  <div className="truncate" title={t.personReference}>
                    {t.personReference}
                  </div>
                  <div className="truncate" title={t.details}>
                    {t.details}
                  </div>
                  <div>{t.documentNumber}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}