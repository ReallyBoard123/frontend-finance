// components/costs/handlers/special-category-handler.tsx
import { useEffect, useRef } from 'react';
import { toast } from "sonner";
import { useTransactionOperations } from '@/lib/hooks/useTransactionOperations';
import type { Transaction } from '@/types/transactions';

interface SpecialCategoryHandlerProps {
  transactions: Transaction[];
  onComplete?: () => void;
}

/**
 * This component ensures special categories (600, 23152) are properly handled
 * - 600 (ELVI:_Festlegungen): Should appear in missing entries
 * - 23152 (Zuweisung für laufende Zwecke): Should be treated as special transactions
 */
export function SpecialCategoryHandler({ 
  transactions,
  onComplete
}: SpecialCategoryHandlerProps) {
  const { updateTransaction } = useTransactionOperations();
  // Use a ref to prevent multiple executions
  const hasRun = useRef(false);

  useEffect(() => {
    // Only run once to prevent infinite loops
    if (hasRun.current || !transactions || transactions.length === 0) return;
    
    const handleSpecialCategories = async () => {
      let modifiedCount = 0;
      
      // Process only transactions that need to be updated
      const specialCodeTransactions = transactions.filter(t => {
        const internalCode = t.internalCode.replace(/^0+/, '');
        return (internalCode === '600' && t.status !== 'pending_inquiry') ||
               (internalCode === '23152' && !t.requiresSpecialHandling);
      });
      
      if (specialCodeTransactions.length === 0) {
        if (onComplete) onComplete();
        return;
      }
      
      for (const transaction of specialCodeTransactions) {
        const internalCode = transaction.internalCode.replace(/^0+/, '');
        
        // For 600 (ELVI:_Festlegungen)
        if (internalCode === '600') {
          const metadata = transaction.metadata as Record<string, unknown> || {};
          if (!metadata.needsReview && transaction.status !== 'pending_inquiry') {
            try {
              await updateTransaction(transaction.id, {
                categoryId: null,
                status: 'unprocessed',
                previousState: {
                  status: transaction.status,
                  categoryId: transaction.categoryId || undefined,
                  categoryCode: transaction.categoryCode
                }
              });
              modifiedCount++;
            } catch (error) {
              console.error('Error handling 600 transaction:', error);
            }
          }
        }
        
        // For 23152 (Zuweisung für laufende Zwecke)
        if (internalCode === '23152' && !transaction.requiresSpecialHandling) {
          try {
            await updateTransaction(transaction.id, {
              requiresSpecialHandling: true,
              previousState: {
                status: transaction.status,
                categoryId: transaction.categoryId || undefined,
                categoryCode: transaction.categoryCode
              }
            });
            modifiedCount++;
          } catch (error) {
            console.error('Error handling 23152 transaction:', error);
          }
        }
      }
      
      if (modifiedCount > 0) {
        toast.success(`Updated ${modifiedCount} special category transactions`);
      }
      
      // Mark as run to prevent infinite loops
      hasRun.current = true;
      
      if (onComplete) onComplete();
    };

    handleSpecialCategories();
    
    // Clean up function that resets the ref when the component unmounts
    return () => {
      hasRun.current = false;
    };
  }, [transactions, updateTransaction, onComplete]);

  // This is a utility component that doesn't render anything
  return null;
}