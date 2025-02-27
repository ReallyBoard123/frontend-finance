import { create } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import { Category } from '@/types/category';
import { Inquiry } from '@/types/inquiry'; 
import { ProcessedData, TransactionUpdate } from '@/types/transaction';
import { FilterParams } from '@/types/common';
import { categoryService } from '@/services/category-service';
import { transactionService } from '@/services/transaction-service';
import { inquiryService } from '@/services/inquiry-service';

// Define the store state
type FinanceState = {
  // Data
  categories: Category[];
  costs: ProcessedData | null;
  inquiries: Inquiry[];
  
  // UI state
  isLoading: {
    categories: boolean;
    transactions: boolean;
    inquiries: boolean;
  };
  error: {
    categories?: string;
    transactions?: string;
    inquiries?: string;
  };
  isHydrated: boolean;
};

// Define the store actions
type FinanceActions = {
  // Category actions
  setCategories: (categories: Category[]) => void;
  fetchCategories: () => Promise<void>;
  
  // Transaction actions
  setCosts: (costs: ProcessedData) => void;
  fetchTransactions: (filters?: FilterParams) => Promise<void>;
  updateTransaction: (id: string, updates: TransactionUpdate) => Promise<void>;
  updateTransactionCategory: (
    transactionId: string,
    categoryId: string | null,
    categoryCode: string | null,
    categoryName: string | null
  ) => Promise<boolean>;
  
  // Inquiry actions
  setInquiries: (inquiries: Inquiry[]) => void;
  fetchInquiries: () => Promise<void>;
  
  // Common actions
  setError: (key: keyof FinanceState['error'], error?: string) => void;
  setLoading: (key: keyof FinanceState['isLoading'], value: boolean) => void;
  setHydrated: (value: boolean) => void;
  reset: () => void;
};

// Combined store type
type FinanceStore = FinanceState & FinanceActions;

// Initial state
const initialState: FinanceState = {
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

// Persistence configuration
const persistOptions: PersistOptions<FinanceStore, Pick<FinanceState, 'categories' | 'costs' | 'inquiries'>> = {
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
};

// Create the store
export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Category actions
      setCategories: (categories) => set({ categories }),
      
      fetchCategories: async () => {
        set(state => ({ 
          isLoading: { ...state.isLoading, categories: true } 
        }));
        
        try {
          const data = await categoryService.getAll();
          set({ categories: data });
          set(state => ({ 
            error: { ...state.error, categories: undefined } 
          }));
        } catch (error) {
          set(state => ({ 
            error: { 
              ...state.error, 
              categories: error instanceof Error ? error.message : 'Failed to fetch categories'
            } 
          }));
          console.error('Error fetching categories:', error);
        } finally {
          set(state => ({ 
            isLoading: { ...state.isLoading, categories: false } 
          }));
        }
      },
      
      // Transaction actions
      setCosts: (costs) => set({ costs }),
      
      fetchTransactions: async (filters) => {
        set(state => ({ 
          isLoading: { ...state.isLoading, transactions: true } 
        }));
        
        try {
          const regularTransactions = await transactionService.getAll({ 
            ...filters, 
            type: 'regular' 
          });
          
          const specialTransactions = await transactionService.getAll({ 
            ...filters, 
            type: 'special' 
          });
          
          // Placeholder for yearly totals calculation
          const yearlyTotals = {};
          
          set({
            costs: {
              transactions: regularTransactions,
              specialTransactions,
              yearlyTotals
            }
          });
          
          set(state => ({ 
            error: { ...state.error, transactions: undefined } 
          }));
        } catch (error) {
          set(state => ({ 
            error: { 
              ...state.error, 
              transactions: error instanceof Error ? error.message : 'Failed to fetch transactions'
            } 
          }));
          console.error('Error fetching transactions:', error);
        } finally {
          set(state => ({ 
            isLoading: { ...state.isLoading, transactions: false } 
          }));
        }
      },
      
      updateTransaction: async (id, updates) => {
        set(state => ({ 
          isLoading: { ...state.isLoading, transactions: true } 
        }));
        
        try {
          await transactionService.update(id, updates);
          await get().fetchTransactions();
          set(state => ({ 
            error: { ...state.error, transactions: undefined } 
          }));
        } catch (error) {
          set(state => ({ 
            error: { 
              ...state.error, 
              transactions: error instanceof Error ? error.message : 'Failed to update transaction'
            } 
          }));
          console.error('Error updating transaction:', error);
        } finally {
          set(state => ({ 
            isLoading: { ...state.isLoading, transactions: false } 
          }));
        }
      },
      
      updateTransactionCategory: async (transactionId, categoryId, categoryCode, categoryName) => {
        const { costs } = get();
        
        if (!costs) {
          set(state => ({ 
            error: { 
              ...state.error, 
              transactions: 'No transactions data available' 
            } 
          }));
          return false;
        }
        
        set(state => ({ 
          isLoading: { ...state.isLoading, transactions: true } 
        }));
        
        try {
          const allTransactions = [...costs.transactions, ...costs.specialTransactions];
          const transaction = allTransactions.find(t => t.id === transactionId);
          
          if (!transaction) {
            throw new Error('Transaction not found');
          }
          
          const previousState = {
            categoryId: transaction.categoryId,
            categoryCode: transaction.categoryCode,
            categoryName: transaction.categoryName
          };
          
          await transactionService.update(transactionId, {
            categoryId,
            categoryCode,
            categoryName,
            status: 'completed',
            previousState
          });
          
          await get().fetchTransactions();
          set(state => ({ 
            error: { ...state.error, transactions: undefined } 
          }));
          return true;
        } catch (error) {
          set(state => ({ 
            error: { 
              ...state.error, 
              transactions: error instanceof Error ? error.message : 'Failed to update transaction category'
            } 
          }));
          console.error('Error updating transaction category:', error);
          return false;
        } finally {
          set(state => ({ 
            isLoading: { ...state.isLoading, transactions: false } 
          }));
        }
      },
      
      // Inquiry actions
      setInquiries: (inquiries) => set({ inquiries }),
      
      fetchInquiries: async () => {
        set(state => ({ 
          isLoading: { ...state.isLoading, inquiries: true } 
        }));
        
        try {
          const data = await inquiryService.getAll();
          set({ inquiries: data });
          set(state => ({ 
            error: { ...state.error, inquiries: undefined } 
          }));
        } catch (error) {
          set(state => ({ 
            error: { 
              ...state.error, 
              inquiries: error instanceof Error ? error.message : 'Failed to fetch inquiries'
            } 
          }));
          console.error('Error fetching inquiries:', error);
        } finally {
          set(state => ({ 
            isLoading: { ...state.isLoading, inquiries: false } 
          }));
        }
      },
      
      // Common actions
      setError: (key, error) => 
        set(state => ({
          error: { ...state.error, [key]: error }
        })),
      
      setLoading: (key, value) =>
        set(state => ({
          isLoading: { ...state.isLoading, [key]: value }
        })),
      
      setHydrated: (value) => set({ isHydrated: value }),
      
      reset: () => set(initialState)
    }),
    persistOptions
  )
);