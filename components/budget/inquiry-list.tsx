import React, { useEffect } from 'react';
import { useFinanceStore } from '@/lib/store';
import { Card } from "@/components/ui/card";

export function InquiryList() {
  const { inquiries, setInquiries } = useFinanceStore();

  useEffect(() => {
    fetch('/api/transaction-inquiries')
      .then(res => res.json())
      .then(response => setInquiries(response.data || []))
      .catch(error => {
        console.error('Error fetching inquiries:', error);
        setInquiries([]);
      });
  }, [setInquiries]);

  const pendingInquiries = Array.isArray(inquiries) ? inquiries.filter(i => i.status === 'pending') : [];

  return (
    <Card className="p-4">
      <div className="text-amber-600 mb-4">
        Pending Inquiries ({pendingInquiries.length})
      </div>
      
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Date</th>
            <th className="text-left p-2">Amount</th>
            <th className="text-left p-2">Reference</th>
            <th className="text-left p-2">Note</th>
          </tr>
        </thead>
        <tbody>
          {pendingInquiries.map((inquiry) => (
            <tr key={inquiry.id} className="border-b hover:bg-gray-50">
              <td className="p-2">
                {new Date(inquiry.transaction.bookingDate).toLocaleDateString('de-DE')}
              </td>
              <td className="p-2">
                {new Intl.NumberFormat('de-DE', { 
                  style: 'currency', 
                  currency: 'EUR' 
                }).format(inquiry.transaction.amount)}
              </td>
              <td className="p-2">{inquiry.transaction.documentNumber}</td>
              <td className="p-2">{inquiry.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}