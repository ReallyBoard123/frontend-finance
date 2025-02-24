import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFinanceStore } from '@/lib/store';
import type { Transaction } from '@/types/transactions';
import { formatDate } from '@/lib/utils';

interface AskGerlindDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AskGerlindDialog({ transaction, open, onOpenChange }: AskGerlindDialogProps) {
  const [note, setNote] = useState('');
  const { updateTransaction } = useFinanceStore();

  const handleSubmit = async () => {
    if (!transaction?.id) return;

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

      updateTransaction(transaction.id, {
        status: 'pending_inquiry',
        previousState: { status: transaction.status }
      });

      onOpenChange(false);
      setNote('');
    } catch (error) {
      console.error('Error saving inquiry:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ask Gerlind</DialogTitle>
        </DialogHeader>
        
        {transaction && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-semibold">Date:</div>
              <div>{formatDate(transaction.bookingDate)}</div>
              
              <div className="font-semibold">Amount:</div>
              <div>{new Intl.NumberFormat('de-DE', { 
                style: 'currency', 
                currency: 'EUR' 
              }).format(transaction.amount)}</div>
              
              <div className="font-semibold">Reference:</div>
              <div>{transaction.documentNumber}</div>
              
              <div className="font-semibold">Description:</div>
              <div>{transaction.description}</div>
            </div>

            <Textarea
              placeholder="Add your note here..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-32"
            />

            <Button onClick={handleSubmit} className="w-full">
              Submit Inquiry
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}