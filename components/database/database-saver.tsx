import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Save } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import type { ProcessedData, Transaction } from '@/types/transactions';

interface DatabaseSaverProps {
  processedData: ProcessedData | null;
  isVerified: boolean;
  onSaveComplete: (message: string) => void;
  selectedNewTransactions?: Transaction[]; // New prop for selected transactions
}

interface YearlyTotalCategory {
  spent: number;
  budget: number;
  remaining: number;
  transactions: Transaction[];
}

function validateTransaction(transaction: Transaction): { isValid: boolean; missingFields: string[]; fixableFields: string[] } {
  const requiredFields = [
    'projectCode',
    'year',
    'amount',
    'internalCode',
    'description',
    'transactionType',
    'bookingDate'
  ];

  const fixableFields = ['costGroup'];

  const missingFields = requiredFields.filter(field => {
    const value = transaction[field as keyof Transaction];
    return value === undefined || value === null || value === '';
  });

  const missingFixableFields = fixableFields.filter(field => {
    const value = transaction[field as keyof Transaction];
    return value === undefined || value === null || value === '';
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
    fixableFields: missingFixableFields
  };
}

function prepareTransactionData(transaction: Transaction, index: number = 0) {
  // Normalize internal code
  const normalizedInternalCode = transaction.internalCode.replace(/^0+/, '');
  
  // Check if it's a special category
  const is600 = normalizedInternalCode === '600';
  const is23152 = normalizedInternalCode === '23152';
  
  // Generate a safe document number that won't have undefined
  const docNumber = transaction.documentNumber || `NODOC-${Date.now()}-${index}`;
  
  // Generate a safe ID that won't have undefined
  const safeId = transaction.id && !transaction.id.includes('undefined') 
    ? transaction.id 
    : `${transaction.projectCode}-${transaction.year}-${docNumber}-${index}`;
    
  return {
    ...transaction,
    id: safeId,
    isSplit: false,
    splitIndex: index,
    internalCode: transaction.internalCode.toString().padStart(4, '0'),
    bookingDate: new Date(transaction.bookingDate).toISOString(),
    invoiceDate: transaction.invoiceDate ? new Date(transaction.invoiceDate).toISOString() : null,
    year: Number(transaction.year),
    amount: Number(transaction.amount),
    requiresSpecialHandling: is23152,
    status: transaction.status || 'unprocessed',
    costGroup: transaction.costGroup || 'Unspecified',
    projectCode: transaction.projectCode.toString(),
    documentNumber: docNumber,
    personReference: transaction.personReference || null,
    details: transaction.details || null,
    invoiceNumber: transaction.invoiceNumber || null,
    paymentPartner: transaction.paymentPartner || null,
    internalAccount: transaction.internalAccount || null,
    accountLabel: transaction.accountLabel || null,
    categoryId: (is600 || is23152) ? null : transaction.categoryId,
    metadata: {
      needsReview: is600,
      originalInternalCode: transaction.internalCode,
      categoryCode: transaction.categoryCode
    }
  };
}

export function DatabaseSaver({ 
  processedData, 
  isVerified, 
  onSaveComplete,
  selectedNewTransactions
}: DatabaseSaverProps) {
  const [saving, setSaving] = useState(false);
  const { categories } = useFinanceStore();

  const handleSave = async () => {
    if (!processedData || !isVerified || saving) return;

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    try {
      // Use only the selected new transactions if provided, otherwise use processedData
      const transactionsToSave = selectedNewTransactions && selectedNewTransactions.length > 0
        ? selectedNewTransactions
        : [...processedData.transactions, ...processedData.specialTransactions];

      console.log(`Attempting to save ${transactionsToSave.length} transactions to database`);

      // Process each transaction
      for (const transaction of transactionsToSave) {
        try {
          const preparedData = prepareTransactionData(transaction);
          
          // Check if transaction already exists
          const checkResponse = await fetch(`/api/transactions/check/${preparedData.id}`);
          const { found } = await checkResponse.json();

          if (found) {
            console.log(`Skipping existing transaction: ${preparedData.id}`);
            skippedCount++;
            continue;
          }

          // Save the transaction
          const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(preparedData)
          });

          if (!response.ok) {
            throw new Error(await response.text());
          }

          successCount++;
        } catch (error) {
          console.error('Error saving transaction:', error);
          errorCount++;
        }

        // Add small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      onSaveComplete(`Successfully saved ${successCount} new transactions, skipped ${skippedCount}, failed ${errorCount}`);
    } catch (error) {
      onSaveComplete(`Save process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Button is disabled if we have selectedNewTransactions but it's empty
  const isDisabled = !processedData || !isVerified || saving || 
                    (selectedNewTransactions && selectedNewTransactions.length === 0);

  return (
    <Button 
      onClick={handleSave} 
      disabled={isDisabled}
      variant="secondary"
      className={`${isVerified ? 'bg-green-500 text-white hover:bg-green-700' : ''}`}
    >
      <Save className="h-4 w-4 mr-2" />
      {saving ? 'Saving...' : 'Save to Database'}
    </Button>
  );
}