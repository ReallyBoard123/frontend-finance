// lib/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Category } from '@/types/budget';
import type { ProcessedData, Transaction, TransactionInquiry, TransactionUpdate } from '@/types/transactions';

interface StoreState {
  // Data
  categories: Category[];
  costs: ProcessedData | null;
  inquiries: TransactionInquiry[];
  
  // Loading states
  isLoading: {
    categories: boolean;
    transactions: boolean;
    inquiries: boolean;
  };
  
  // Error states
  error: {
    categories?: string;
    transactions?: string;
    inquiries?: string;
  };
  
  // Hydration state
  isHydrated: boolean;
}

interface StoreActions {
  // Data setters
  setCategories: (categories: Category[]) => void;
  setCosts: (costs: ProcessedData) => void;
  setInquiries: (inquiries: TransactionInquiry[]) => void;
  updateTransaction: (id: string, updates: TransactionUpdate) => void;
  
  // Loading state setters
  setLoading: (key: keyof StoreState['isLoading'], value: boolean) => void;
  
  // Error state setters
  setError: (key: keyof StoreState['error'], error: string | undefined) => void;
  
  // Data fetchers
  fetchCategories: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchInquiries: () => Promise<void>;
  
  // Hydration setter
  setHydrated: (value: boolean) => void;
  
  // Reset store
  reset: () => void;
}

type FinanceStore = StoreState & StoreActions;

const initialState: StoreState = {
  categories: [],
  costs: null,
  inquiries: [],
  isLoading: {
    categories: false,
    transactions: false,
    inquiries: false,
  },
  error: {},
  isHydrated: false,
};

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Data setters
      setCategories: (categories) => 
        set({ categories }),

      setCosts: (costs) => 
        set({ costs }),

      setInquiries: (inquiries) => 
        set({ inquiries: Array.isArray(inquiries) ? inquiries : [] }),

      updateTransaction: (id, updates) => 
        set((state) => {
          if (!state.costs) return state;
          
          const updatedTransactions = state.costs.transactions.map(transaction =>
            transaction.id === id ? { ...transaction, ...updates } : transaction
          );

          return {
            ...state,
            costs: {
              ...state.costs,
              transactions: updatedTransactions
            }
          };
        }),

      // Loading state setters
      setLoading: (key, value) =>
        set((state) => ({
          isLoading: {
            ...state.isLoading,
            [key]: value,
          },
        })),

      // Error state setters
      setError: (key, error) =>
        set((state) => ({
          error: {
            ...state.error,
            [key]: error,
          },
        })),

      // Data fetchers
      fetchCategories: async () => {
        const store = get();
        if (store.isLoading.categories) return;

        store.setLoading('categories', true);
        try {
          const response = await fetch('/api/categories');
          if (!response.ok) throw new Error('Failed to fetch categories');
          
          const data = await response.json();
          const formattedCategories = data.map((category: Category) => ({
            ...category,
            budgets: category.budgets || {},
          }));
          
          set({ categories: formattedCategories });
          store.setError('categories', undefined);
        } catch (error) {
          store.setError('categories', error instanceof Error ? error.message : 'Unknown error');
          console.error('Error fetching categories:', error);
        } finally {
          store.setLoading('categories', false);
        }
      },

      fetchTransactions: async () => {
        const store = get();
        if (store.isLoading.transactions) return;

        store.setLoading('transactions', true);
        try {
          const [regularRes, specialRes] = await Promise.all([
            fetch('/api/transactions?type=regular'),
            fetch('/api/transactions?type=special'),
          ]);

          if (!regularRes.ok || !specialRes.ok) {
            throw new Error('Failed to fetch transactions');
          }

          const [regular, special] = await Promise.all([
            regularRes.json(),
            specialRes.json(),
          ]);

          const data = {
            transactions: regular.transactions || [],
            specialTransactions: special.transactions || [],
            yearlyTotals: calculateYearlyTotals(regular.transactions || [], store.categories),
          };

          set({ costs: data });
          store.setError('transactions', undefined);
        } catch (error) {
          store.setError('transactions', error instanceof Error ? error.message : 'Unknown error');
          console.error('Error fetching transactions:', error);
        } finally {
          store.setLoading('transactions', false);
        }
      },

      fetchInquiries: async () => {
        const store = get();
        if (store.isLoading.inquiries) return;

        store.setLoading('inquiries', true);
        try {
          const response = await fetch('/api/transaction-inquiries');
          if (!response.ok) throw new Error('Failed to fetch inquiries');
          
          const data = await response.json();
          set({ inquiries: Array.isArray(data) ? data : [] });
          store.setError('inquiries', undefined);
        } catch (error) {
          store.setError('inquiries', error instanceof Error ? error.message : 'Unknown error');
          console.error('Error fetching inquiries:', error);
        } finally {
          store.setLoading('inquiries', false);
        }
      },

      // Hydration setter
      setHydrated: (value) => 
        set({ isHydrated: value }),

      // Reset store
      reset: () => 
        set(initialState),
    }),
    {
      name: 'finance-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        categories: state.categories,
        costs: state.costs,
        inquiries: state.inquiries,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

// Helper function for calculating yearly totals
function calculateYearlyTotals(transactions: Transaction[], categories: Category[]) {
  const yearlyTotals: Record<string, Record<string, any>> = {};
  const years = [...new Set(transactions.map(t => t.year.toString()))];
  
  years.forEach(year => {
    yearlyTotals[year] = {};
    categories.forEach(category => {
      yearlyTotals[year][category.code] = {
        spent: 0,
        budget: category.budgets?.[year] || 0,
        remaining: category.budgets?.[year] || 0,
        transactions: []
      };
    });
  });

  transactions.forEach(transaction => {
    const year = transaction.year.toString();
    const categoryCode = transaction.categoryCode;
    if (!categoryCode) return;
    
    if (yearlyTotals[year][categoryCode]) {
      yearlyTotals[year][categoryCode].spent += transaction.amount;
      yearlyTotals[year][categoryCode].remaining = 
        yearlyTotals[year][categoryCode].budget - yearlyTotals[year][categoryCode].spent;
      yearlyTotals[year][categoryCode].transactions.push(transaction);
    }

    const category = categories.find(c => c.code === categoryCode);
    if (!category) return;

    const parentCategory = categories.find(c => c.id === category.parentId);
    if (parentCategory && yearlyTotals[year][parentCategory.code]) {
      yearlyTotals[year][parentCategory.code].spent += transaction.amount;
      yearlyTotals[year][parentCategory.code].remaining = 
        yearlyTotals[year][parentCategory.code].budget - yearlyTotals[year][parentCategory.code].spent;
    }
  });

  return yearlyTotals;
}