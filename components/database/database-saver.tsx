import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Save } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import type { ProcessedData, Transaction } from '@/types/transactions';

interface DatabaseSaverProps {
  processedData: ProcessedData | null;
  isVerified: boolean;
  onSaveComplete: (message: string) => void;
}

function generateTransactionId(transaction: Transaction): string {
  const docNumber = transaction.documentNumber || `NO_DOC_${Date.now()}`;
  return `${transaction.projectCode}-${transaction.year}-${docNumber}`;
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

function prepareTransactionData(transaction: Transaction) {
  return {
    ...transaction,
    id: generateTransactionId(transaction),
    internalCode: transaction.internalCode.toString().padStart(4, '0'),
    bookingDate: new Date(transaction.bookingDate).toISOString(),
    invoiceDate: transaction.invoiceDate ? new Date(transaction.invoiceDate).toISOString() : null,
    year: Number(transaction.year),
    amount: Number(transaction.amount),
    requiresSpecialHandling: Boolean(transaction.requiresSpecialHandling),
    status: transaction.status || 'unprocessed',
    costGroup: transaction.costGroup || 'Unspecified',
    projectCode: transaction.projectCode.toString(),
    documentNumber: transaction.documentNumber?.toString() || null,
    personReference: transaction.personReference || null,
    details: transaction.details || null,
    invoiceNumber: transaction.invoiceNumber || null,
    paymentPartner: transaction.paymentPartner || null,
    internalAccount: transaction.internalAccount || null,
    accountLabel: transaction.accountLabel || null,
    categoryId: transaction.categoryId || null,
    categoryCode: transaction.categoryCode || null,
    categoryName: transaction.categoryName || null
  };
}

export function DatabaseSaver({ processedData, isVerified, onSaveComplete }: DatabaseSaverProps) {
  const [saving, setSaving] = useState(false);
  const { setCosts, categories } = useFinanceStore();

  const calculateYearlyTotals = (transactions: Transaction[]) => {
    const yearlyTotals: Record<string, Record<string, any>> = {};
    const years = [...new Set(transactions.map(t => t.year.toString()))];
    
    years.forEach(year => {
      yearlyTotals[year] = {};
      categories.forEach(category => {
        yearlyTotals[year][category.code] = {
          spent: 0,
          budget: category.budgets?.[year] || 0,
          remaining: category.budgets?.[year] || 0,
          transactions: []
        };
      });
    });

    transactions.forEach(transaction => {
      const year = transaction.year.toString();
      const categoryCode = transaction.categoryCode;
      if (!categoryCode) return;
      
      if (yearlyTotals[year][categoryCode]) {
        yearlyTotals[year][categoryCode].spent += transaction.amount;
        yearlyTotals[year][categoryCode].remaining = 
          yearlyTotals[year][categoryCode].budget - yearlyTotals[year][categoryCode].spent;
        yearlyTotals[year][categoryCode].transactions.push(transaction);
      }
    });

    return yearlyTotals;
  };

  const handleSave = async () => {
    if (!processedData || !isVerified || saving) return;

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    try {
      const allTransactions = [
        ...processedData.transactions,
        ...processedData.specialTransactions
      ];

      for (const transaction of allTransactions) {
        const { isValid, missingFields, fixableFields } = validateTransaction(transaction);
        const hasFixableFieldsOnly = !isValid && missingFields.length === 0 && fixableFields.length > 0;

        if (!isValid && !hasFixableFieldsOnly) {
          errorCount++;
          continue;
        }

        try {
          const preparedData = prepareTransactionData(transaction);
          const checkResponse = await fetch(`/api/transactions/check/${preparedData.id}`);
          const { found } = await checkResponse.json();

          if (found) {
            skippedCount++;
            continue;
          }

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
          errorCount++;
        }

        // Add small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Fetch updated data after save
      const [regularRes, specialRes] = await Promise.all([
        fetch('/api/transactions?type=regular'),
        fetch('/api/transactions?type=special')
      ]);

      const [regularData, specialData] = await Promise.all([
        regularRes.json(),
        specialRes.json()
      ]);

      // Update store with fresh data
      const newData = {
        transactions: regularData.transactions || [],
        specialTransactions: specialData.transactions || [],
        yearlyTotals: calculateYearlyTotals(regularData.transactions || [])
      };

      setCosts(newData);
      onSaveComplete(`Processed: ${successCount} saved, ${skippedCount} skipped, ${errorCount} failed`);
    } catch (error) {
      onSaveComplete(`Save process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button 
      onClick={handleSave} 
      disabled={!processedData || !isVerified || saving}
      variant="secondary"
    >
      <Save className="h-4 w-4 mr-2" />
      {saving ? 'Saving...' : 'Save to Database'}
    </Button>
  );
}