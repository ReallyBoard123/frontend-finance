// components/costs/tabs/costs-tabs.tsx
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProcessedData, TransactionUpdate } from '@/types/transactions';
import type { Category } from '@/types/budget';
import { InquiryList } from '../budget/inquiry-list';
import { SpecialCategorySummary } from '../budget/special-categories-summary';
import { CostsSummary } from './costs-summary';
import { InspectMode } from './inspect-mode';
import { MissingEntriesList } from './missing-enteries/missing-entries';
import { TransactionList } from './transaction-list';

interface CostsTabsProps {
  processedData: ProcessedData;
  categories: Category[];
  onTransactionUpdate: (transactionId: string, updates: TransactionUpdate) => void;
  showVerticalTotals?: boolean; // New prop for showing vertical totals
}

export function CostsTabs({ 
  processedData, 
  categories, 
  onTransactionUpdate,
  showVerticalTotals = false // Default to false to prioritize horizontal totals
}: CostsTabsProps) {
  return (
    <Tabs defaultValue="summary" className="w-full">
      <TabsList>
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="details">Transaction Details</TabsTrigger>
        <TabsTrigger value="special">Special Transactions</TabsTrigger>
        <TabsTrigger value="missing">Missing Entries</TabsTrigger>
        <TabsTrigger value="inquiries">Ask Gerlind</TabsTrigger>
      </TabsList>

      <TabsContent value="summary">
        <InspectMode transactions={processedData.transactions}>
          <CostsSummary 
            categories={categories}
            yearlyTotals={processedData.yearlyTotals}
            showVerticalTotals={showVerticalTotals} // Pass the prop
          />
          <div className="mt-6">
            <SpecialCategorySummary
              transactions={[...processedData.transactions, ...processedData.specialTransactions]}
              categories={categories}
              years={["2023", "2024", "2025"]}
            />
          </div>
        </InspectMode>
      </TabsContent>

      <TabsContent value="details">
        <TransactionList 
          initialTransactions={processedData?.transactions || []}
          categories={categories}
        />
      </TabsContent>

      <TabsContent value="special">
        <TransactionList 
          initialTransactions={processedData?.specialTransactions || []}
          categories={categories}
          isSpecial={true}
        />
      </TabsContent>

      <TabsContent value="missing">
        <MissingEntriesList
          transactions={processedData.transactions}
          categories={categories}
          onTransactionUpdate={onTransactionUpdate}
        />
      </TabsContent>

      <TabsContent value="inquiries">
        <InquiryList />
      </TabsContent>
    </Tabs>
  );
}