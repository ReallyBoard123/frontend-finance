// lib/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Category } from '@/types/budget';
import type { ProcessedData, TransactionInquiry, TransactionUpdate } from '@/types/transactions';

interface StoreState {
  // Core data
  categories: Category[];
  costs: ProcessedData | null;
  inquiries: TransactionInquiry[];
  
  // UI states
  isLoading: Record<string, boolean>;
  error: Record<string, string | undefined>;
  isHydrated: boolean;
  
  // Flag to track DB resets
  lastDbCheck: number; // Timestamp of last DB check
}

interface StoreActions {
  // Simple setters
  setCategories: (categories: Category[]) => void;
  setCosts: (costs: ProcessedData) => void;
  setInquiries: (inquiries: TransactionInquiry[]) => void;
  updateTransaction: (id: string, updates: TransactionUpdate) => void;
  
  // State management
  setLoading: (key: string, value: boolean) => void;
  setError: (key: string, error: string | undefined) => void;
  setHydrated: (value: boolean) => void;
  setLastDbCheck: (timestamp: number) => void;
  
  // Full reset
  reset: () => void;
}

type FinanceStore = StoreState & StoreActions;

const initialState: StoreState = {
  categories: [],
  costs: null,
  inquiries: [],
  isLoading: {},
  error: {},
  isHydrated: false,
  lastDbCheck: 0
};

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Basic setters
      setCategories: (categories) => set({ categories }),
      setCosts: (costs) => set({ costs }),
      setInquiries: (inquiries) => set({ inquiries: Array.isArray(inquiries) ? inquiries : [] }),
      
      // Update the timestamp of last DB check
      setLastDbCheck: (timestamp) => set({ lastDbCheck: timestamp }),
      
      // Update a single transaction in the store
      updateTransaction: (id, updates) => set((state) => {
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
      
      // State management
      setLoading: (key, value) => set((state) => ({
        isLoading: { ...state.isLoading, [key]: value }
      })),
      
      setError: (key, error) => set((state) => ({
        error: { ...state.error, [key]: error }
      })),
      
      setHydrated: (value) => set({ isHydrated: value }),
      
      // Reset the entire store to initial state
      reset: () => {
        // Clear localStorage persistence
        localStorage.removeItem('finance-store');
        // Reset state to initial
        set(initialState);
      },
    }),
    {
      name: 'finance-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist these keys to avoid issues with stale data
      partialize: (state) => ({
        lastDbCheck: state.lastDbCheck,
        isHydrated: state.isHydrated
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);