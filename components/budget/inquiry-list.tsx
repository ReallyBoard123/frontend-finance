// components/budget/inquiry-list.tsx
import React, { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ActionButton } from "@/components/common/ui/action-button";
import { DataTable } from "@/components/common/data-table/data-table";
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useInquiryOperations } from '@/lib/hooks/useInquiryOperations';
import { formatDate } from '@/lib/utils';
import type { TransactionInquiry } from '@/types/transactions';

export function InquiryList() {
  const { pendingInquiries, isLoading, fetchInquiries, resolveInquiry } = useInquiryOperations();

  useEffect(() => {
    // Fetch inquiries when component mounts
    fetchInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    {
      key: 'date',
      header: 'Date',
      cell: (inquiry: TransactionInquiry) => formatDate(inquiry.transaction.bookingDate)
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (inquiry: TransactionInquiry) => new Intl.NumberFormat('de-DE', { 
        style: 'currency', 
        currency: 'EUR' 
      }).format(inquiry.transaction.amount)
    },
    {
      key: 'reference',
      header: 'Reference',
      cell: (inquiry: TransactionInquiry) => inquiry.transaction.documentNumber || '-'
    },
    {
      key: 'note',
      header: 'Note',
      cell: (inquiry: TransactionInquiry) => inquiry.note
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (inquiry: TransactionInquiry) => (
        <div className="flex justify-end space-x-2">
          <ActionButton 
            onClick={() => resolveInquiry(inquiry, true)}
            icon={CheckCircle}
            label="Resolve"
            variant="ghost"
            size="sm"
          />
          <ActionButton 
            onClick={() => resolveInquiry(inquiry, false)}
            icon={XCircle}
            label="Reject"
            variant="ghost"
            size="sm"
          />
        </div>
      )
    }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-amber-600">
          Pending Inquiries ({pendingInquiries.length})
        </CardTitle>
        <ActionButton 
          onClick={fetchInquiries} 
          disabled={isLoading}
          loading={isLoading}
          icon={RefreshCw}
          label="Refresh"
          variant="outline"
          size="sm"
        />
      </CardHeader>
      <CardContent>
        <DataTable
          data={pendingInquiries.map(inquiry => ({
            ...inquiry,
            id: inquiry.id // Ensure each item has an id for DataTable
          }))}
          columns={columns}
          emptyMessage="No pending inquiries"
        />
      </CardContent>
    </Card>
  );
}