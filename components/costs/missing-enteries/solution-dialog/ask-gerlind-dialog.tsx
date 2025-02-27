import React, { useState } from 'react';
import { FormDialog } from "@/components/common/dialogs/form-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useInquiryOperations } from '@/lib/hooks/useInquiryOperations';
import { formatDate } from '@/lib/utils';
import type { Transaction } from '@/types/transactions';

interface AskGerlindDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AskGerlindDialog({ transaction, open, onOpenChange }: AskGerlindDialogProps) {
  const [note, setNote] = useState('');
  const { isLoading, createInquiry } = useInquiryOperations();

  const handleSubmit = async () => {
    if (!transaction?.id) return;
    if (!note.trim()) {
      toast.error('Please add a note before submitting');
      return;
    }

    try {
      const success = await createInquiry(transaction.id, note);
      if (success) {
        toast.success('Inquiry sent successfully');
        onOpenChange(false);
        setNote('');
      } else {
        toast.error('Failed to send inquiry');
      }
    } catch (error) {
      console.error('Error saving inquiry:', error);
      toast.error('Failed to send inquiry');
    }
  };

  if (!transaction) return null;

  return (
    <FormDialog
      title="Ask Gerlind About This Transaction"
      isOpen={open}
      onClose={() => onOpenChange(false)}
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      submitLabel="Submit Inquiry"
      isSubmitDisabled={!note.trim()}
    >
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
      </div>
    </FormDialog>
  );
}