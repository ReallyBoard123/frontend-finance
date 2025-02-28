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

interface YearlyTotalCategory {
  spent: number;
  budget: number;
  remaining: number;
  transactions: Transaction[];
}

function generateTransactionId(transaction: Transaction, index: number = 0): string {
  // Include the transaction's current ID if it already has one (which includes the index)
  if (transaction.id && transaction.id.includes('-')) {
    return transaction.id;
  }
  
  // Otherwise generate a new ID with an index suffix
  const docNumber = transaction.documentNumber || `NO_DOC_${Date.now()}`;
  return `${transaction.projectCode}-${transaction.year}-${docNumber}-${index}`;
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

interface TransactionMetadata {
  needsReview?: boolean;
  originalInternalCode?: string;
  categoryCode?: string;
}

function prepareTransactionData(transaction: Transaction, index: number = 0) {
  // For special numeric codes (600, 23152), preserve them without forcing a category
  const isSpecialCode = /^0*(600|23152)$/.test(transaction.internalCode);
  
  // Keep categoryId null for special codes to preserve their nature
  const categoryId = isSpecialCode ? null : transaction.categoryId;
  
  // For special codes, use the raw code as the display code
  const categoryCode = isSpecialCode ? transaction.internalCode : transaction.categoryCode;
  
  return {
    ...transaction,
    id: generateTransactionId(transaction, index),
    isSplit: false, // Set to true if you know it's a split transaction
    splitIndex: index,
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
    categoryId: categoryId,
    // Store additional metadata for future reference
    metadata: {
      needsReview: isSpecialCode, // Flag special codes for review in Missing Entries
      originalInternalCode: transaction.internalCode,
      categoryCode: categoryCode
    } as TransactionMetadata
  };
}


export function DatabaseSaver({ processedData, isVerified, onSaveComplete }: DatabaseSaverProps) {
  const [saving, setSaving] = useState(false);
  const { setCosts, categories } = useFinanceStore();

  const calculateYearlyTotals = (transactions: Transaction[]) => {
    const yearlyTotals: Record<string, Record<string, YearlyTotalCategory>> = {};
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

      const category = categories.find(c => c.code === categoryCode);
      if (!category) return;

      const parentCategory = categories.find(c => c.id === category.parentId);
      if (parentCategory && yearlyTotals[year][parentCategory.code]) {
        yearlyTotals[year][parentCategory.code].spent += transaction.amount;
        yearlyTotals[year][parentCategory.code].remaining = 
          yearlyTotals[year][parentCategory.code].budget - yearlyTotals[year][parentCategory.code].spent;
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

      // Group transactions by document number to identify splits
      const transactionsByDoc = allTransactions.reduce((acc, transaction) => {
        const docKey = `${transaction.projectCode}-${transaction.year}-${transaction.documentNumber}`;
        if (!acc[docKey]) {
          acc[docKey] = [];
        }
        acc[docKey].push(transaction);
        return acc;
      }, {} as Record<string, Transaction[]>);

      // Process each transaction with split awareness
      for (const [docKey, docTransactions] of Object.entries(transactionsByDoc)) {
        const isSplit = docTransactions.length > 1;
        
        for (let i = 0; i < docTransactions.length; i++) {
          const transaction = docTransactions[i];
          const { isValid, missingFields, fixableFields } = validateTransaction(transaction);
          const hasFixableFieldsOnly = !isValid && missingFields.length === 0 && fixableFields.length > 0;

          if (!isValid && !hasFixableFieldsOnly) {
            errorCount++;
            continue;
          }

          try {
            // Use the index when preparing the data
            const preparedData = prepareTransactionData(transaction, i);
            
            // Set split-related fields if this is part of a split transaction
            if (isSplit) {
              preparedData.isSplit = true;
              preparedData.totalSplits = docTransactions.length;
              preparedData.splitIndex = i;
              
              // Set original amount if this is the first split
              if (i === 0) {
                const totalAmount = docTransactions.reduce((sum, t) => sum + t.amount, 0);
                preparedData.originalAmount = totalAmount;
              }
            }

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
          } catch {
            errorCount++;
          }

          // Add small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 50));
        }
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