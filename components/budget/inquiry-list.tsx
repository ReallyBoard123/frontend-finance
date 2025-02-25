import React, { useEffect, useState } from 'react';
import { useFinanceStore } from '@/lib/store';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { toast } from "sonner";
import type { TransactionInquiry } from '@/types/transactions';
import { formatDate } from '@/lib/utils';

export function InquiryList() {
  const { inquiries, setInquiries, updateTransaction } = useFinanceStore();
  const [isLoading, setIsLoading] = useState(false);

  const fetchInquiries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/transaction-inquiries');
      if (!response.ok) throw new Error('Failed to fetch inquiries');
      
      const data = await response.json();
      setInquiries(data);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      toast.error('Failed to load inquiries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleResolveInquiry = async (inquiry: TransactionInquiry, resolved: boolean) => {
    try {
      // Update the inquiry status
      const response = await fetch(`/api/transaction-inquiries/${inquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: resolved ? 'resolved' : 'rejected',
        }),
      });

      if (!response.ok) throw new Error('Failed to update inquiry');

      // Update transaction status
      updateTransaction(inquiry.transaction.id, {
        status: resolved ? 'completed' : 'unprocessed'
      });

      // Refresh inquiry list
      fetchInquiries();
      
      toast.success(`Inquiry ${resolved ? 'resolved' : 'rejected'} successfully`);
    } catch (error) {
      console.error('Error updating inquiry:', error);
      toast.error('Failed to update inquiry');
    }
  };

  const pendingInquiries = Array.isArray(inquiries) 
    ? inquiries.filter(i => i.status === 'pending')
    : [];

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-amber-600">
          Pending Inquiries ({pendingInquiries.length})
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchInquiries} 
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>
      
      {pendingInquiries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No pending inquiries
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Reference</th>
                <th className="text-left p-2">Note</th>
                <th className="text-right p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingInquiries.map((inquiry) => (
                <tr key={inquiry.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    {formatDate(inquiry.transaction.bookingDate)}
                  </td>
                  <td className="p-2">
                    {new Intl.NumberFormat('de-DE', { 
                      style: 'currency', 
                      currency: 'EUR' 
                    }).format(inquiry.transaction.amount)}
                  </td>
                  <td className="p-2">{inquiry.transaction.documentNumber}</td>
                  <td className="p-2">{inquiry.note}</td>
                  <td className="p-2 flex justify-end space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleResolveInquiry(inquiry, true)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                      Resolve
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleResolveInquiry(inquiry, false)}
                    >
                      <XCircle className="h-4 w-4 mr-1 text-red-600" />
                      Reject
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}