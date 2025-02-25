import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { useFinanceStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import type { Transaction } from '@/types/transactions';

interface AskGerlindDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AskGerlindDialog({ transaction, open, onOpenChange }: AskGerlindDialogProps) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateTransaction } = useFinanceStore();

  const handleSubmit = async () => {
    if (!transaction?.id) return;
    if (!note.trim()) {
      toast.error('Please add a note before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/transaction-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction.id,
          note
        }),
      });

      if (!response.ok) throw new Error('Failed to save inquiry');

      // Update transaction status in the store
      updateTransaction(transaction.id, {
        status: 'pending_inquiry',
        previousState: { status: transaction.status }
      });

      toast.success('Inquiry sent successfully');
      onOpenChange(false);
      setNote('');
    } catch (error) {
      console.error('Error saving inquiry:', error);
      toast.error('Failed to send inquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!isSubmitting) onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ask Gerlind About This Transaction</DialogTitle>
        </DialogHeader>
        
        {transaction && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm border p-3 rounded-md bg-gray-50">
              <div className="font-semibold">Date:</div>
              <div>{formatDate(transaction.bookingDate)}</div>
              
              <div className="font-semibold">Amount:</div>
              <div>{new Intl.NumberFormat('de-DE', { 
                style: 'currency', 
                currency: 'EUR' 
              }).format(transaction.amount)}</div>
              
              <div className="font-semibold">Reference:</div>
              <div>{transaction.documentNumber || '-'}</div>
              
              <div className="font-semibold">Description:</div>
              <div>{transaction.description}</div>

              <div className="font-semibold">Category:</div>
              <div>{transaction.categoryCode || transaction.internalCode}</div>
            </div>

            <div className="space-y-2">
              <label htmlFor="note" className="text-sm font-medium">
                Your Question or Comment:
              </label>
              <Textarea
                id="note"
                placeholder="e.g., Please help identify the correct category for this transaction..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-32"
              />
            </div>

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
                disabled={isSubmitting || !note.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Submit Inquiry'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}