import { useState } from 'react';
import { useFinanceStore } from '@/lib/store';
import type { TransactionInquiry } from '@/types/transactions';

export function useInquiryOperations() {
  const { inquiries, setInquiries, updateTransaction } = useFinanceStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInquiries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/transaction-inquiries');
      if (!response.ok) throw new Error('Failed to fetch inquiries');
      
      const data = await response.json();
      setInquiries(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const createInquiry = async (transactionId: string, note: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/transaction-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, note }),
      });

      if (!response.ok) throw new Error('Failed to save inquiry');

      updateTransaction(transactionId, { status: 'pending_inquiry' });
      await fetchInquiries();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resolveInquiry = async (inquiry: TransactionInquiry, resolved: boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/transaction-inquiries/${inquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: resolved ? 'resolved' : 'rejected',
        }),
      });

      if (!response.ok) throw new Error('Failed to update inquiry');

      updateTransaction(inquiry.transaction.id, {
        status: resolved ? 'completed' : 'unprocessed'
      });

      await fetchInquiries();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const pendingInquiries = Array.isArray(inquiries) 
    ? inquiries.filter(i => i.status === 'pending')
    : [];

  return {
    inquiries,
    pendingInquiries,
    isLoading,
    error,
    fetchInquiries,
    createInquiry,
    resolveInquiry
  };
}