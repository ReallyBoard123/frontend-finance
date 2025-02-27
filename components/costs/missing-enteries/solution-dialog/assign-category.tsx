import React, { useState, useMemo } from 'react';
import { FormDialog } from "@/components/common/dialogs/form-dialog";
import { CategorySelect } from "@/components/common/ui/category-select";
import { FolderTree } from 'lucide-react';
import { toast } from "sonner";
import { useTransactionOperations } from '@/lib/hooks/useTransactionOperations';
import { formatDate } from '@/lib/utils';
import type { Transaction } from '@/types/transactions';
import type { Category } from '@/types/budget';

interface AssignCategoryDialogProps {
  transaction: Transaction | null;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryAssign?: (transactionId: string, categoryId: string, categoryCode: string) => Promise<void>;
}

export function AssignCategoryDialog({ 
  transaction, 
  categories, 
  open, 
  onOpenChange, 
  onCategoryAssign 
}: AssignCategoryDialogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const { isLoading, updateTransactionCategory } = useTransactionOperations();

  // Find the parent category based on the transaction's current category code
  const parentCategory = useMemo(() => {
    if (!transaction?.categoryCode) return null;
    return categories.find(cat => cat.code === transaction.categoryCode);
  }, [transaction, categories]);

  // Get child categories of the parent
  const childCategories = useMemo(() => {
    if (!parentCategory) return [];
    return categories.filter(cat => cat.parentId === parentCategory.id);
  }, [parentCategory, categories]);

  const handleSubmit = async () => {
    if (!transaction?.id || !selectedCategoryId) return;
    
    try {
      // Find selected category details
      const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
      if (!selectedCategory) throw new Error('Selected category not found');
      
      if (onCategoryAssign) {
        // Use provided callback if available
        await onCategoryAssign(
          transaction.id, 
          selectedCategory.id, 
          selectedCategory.code
        );
      } else {
        // Otherwise use the hook method
        await updateTransactionCategory(
          transaction.id,
          selectedCategory.id,
          selectedCategory.code,
          selectedCategory.name
        );
      }
      
      toast.success('Category assigned successfully');
      onOpenChange(false);
      setSelectedCategoryId('');
    } catch (error) {
      console.error('Error assigning category:', error);
      toast.error('Failed to assign category');
    }
  };

  if (!transaction) return null;

  return (
    <FormDialog
      title="Assign Category"
      isOpen={open}
      onClose={() => onOpenChange(false)}
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      submitLabel="Assign Category"
      isSubmitDisabled={!selectedCategoryId}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm border p-3 rounded-md bg-gray-50">
          <div className="font-semibold">Transaction:</div>
          <div>{transaction.documentNumber || transaction.personReference}</div>
          
          <div className="font-semibold">Date:</div>
          <div>{formatDate(transaction.bookingDate)}</div>
          
          <div className="font-semibold">Amount:</div>
          <div>{new Intl.NumberFormat('de-DE', { 
            style: 'currency', 
            currency: 'EUR' 
          }).format(transaction.amount)}</div>
          
          <div className="font-semibold">Current Category:</div>
          <div>{transaction.categoryCode || transaction.internalCode}</div>
        </div>

        {parentCategory && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FolderTree className="h-4 w-4" />
              <span>Parent Category: {parentCategory.code} - {parentCategory.name}</span>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Select Child Category:
              </label>
              <CategorySelect 
                categories={childCategories}
                selectedCategoryId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
                placeholder="Select a category"
              />
            </div>
          </div>
        )}
      </div>
    </FormDialog>
  );
}