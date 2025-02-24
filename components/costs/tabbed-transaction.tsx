import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Transaction as TransactionType } from '@/types/transactions';

type Transaction = TransactionType;

interface TransactionDetailsProps {
  transactions: Transaction[];
  categoryCode: string;
  year: number;
}

export function TransactionDetails({ transactions, categoryCode, year }: TransactionDetailsProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchTransactionCount = async () => {
      try {
        const response = await fetch('/api/transactions');
        const data = await response.json();
        setCount(data.count);
      } catch (error) {
        console.error('Error fetching transaction count:', error);
      }
    };
    
    fetchTransactionCount();
  }, []);

  const groupedTransactions = transactions.reduce((acc, transaction) => {
    const key = transaction.personReference || 'Unknown';
    if (!acc[key]) {
      acc[key] = {
        transactions: [],
        total: 0
      };
    }
    acc[key].transactions.push(transaction);
    acc[key].total += transaction.amount;
    return acc;
  }, {} as Record<string, { transactions: Transaction[], total: number }>);

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Loaded {count} transactions from database
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          {Object.keys(groupedTransactions).map(reference => (
            <TabsTrigger key={reference} value={reference}>{reference}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="summary">
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(groupedTransactions).map(([reference, data]) => (
              <AccordionItem key={reference} value={reference}>
                <AccordionTrigger className="grid grid-cols-3 w-full px-4">
                  <span>{reference}</span>
                  <span>{data.transactions.length} transactions</span>
                  <span className="text-right">{data.total.toLocaleString('de-DE')} €</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="px-4 py-2 text-left">Amount</th>
                          <th className="px-4 py-2 text-left">Details</th>
                          <th className="px-4 py-2 text-left">Document</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.transactions.map((transaction, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2">
                              {new Date(transaction.bookingDate).toLocaleDateString('de-DE')}
                            </td>
                            <td className="px-4 py-2">
                              {transaction.amount.toLocaleString('de-DE')} €
                            </td>
                            <td className="px-4 py-2">{transaction.details}</td>
                            <td className="px-4 py-2">{transaction.documentNumber}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        {Object.entries(groupedTransactions).map(([reference, data]) => (
          <TabsContent key={reference} value={reference}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{reference}</h3>
                <span className="font-bold">
                  Total: {data.total.toLocaleString('de-DE')} €
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Details</th>
                      <th className="px-4 py-2 text-left">Document</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((transaction, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-2">
                          {new Date(transaction.bookingDate).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-4 py-2">
                          {transaction.amount.toLocaleString('de-DE')} €
                        </td>
                        <td className="px-4 py-2">{transaction.details}</td>
                        <td className="px-4 py-2">{transaction.documentNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}