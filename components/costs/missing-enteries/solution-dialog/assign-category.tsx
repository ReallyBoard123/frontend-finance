import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FolderTree } from 'lucide-react';
import { toast } from "sonner";
import { useFinanceStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import type { Transaction } from '@/types/transactions';
import type { Category } from '@/types/budget';

interface AssignCategoryDialogProps {
  transaction: Transaction | null;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryAssign: (transactionId: string, categoryId: string, categoryCode: string) => Promise<void>;
}

export function AssignCategoryDialog({ 
  transaction, 
  categories, 
  open, 
  onOpenChange, 
  onCategoryAssign 
}: AssignCategoryDialogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    setIsSubmitting(true);
    try {
      // Find selected category details
      const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
      if (!selectedCategory) throw new Error('Selected category not found');
      
      // Call onCategoryAssign with transaction ID and category details
      await onCategoryAssign(
        transaction.id, 
        selectedCategory.id, 
        selectedCategory.code
      );
      
      toast.success('Category assigned successfully');
      onOpenChange(false);
      setSelectedCategoryId('');
    } catch (error) {
      console.error('Error assigning category:', error);
      toast.error('Failed to assign category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!isSubmitting) {
        onOpenChange(newOpen);
        if (!newOpen) setSelectedCategoryId('');
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Category</DialogTitle>
        </DialogHeader>
        
        {transaction && (
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
                  <Select 
                    value={selectedCategoryId} 
                    onValueChange={setSelectedCategoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {childCategories.length > 0 ? (
                        childCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.code} - {category.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No child categories available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="secondary" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting || !selectedCategoryId}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Assign Category'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}