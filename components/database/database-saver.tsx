// components/database/database-saver.tsx
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Save } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import type { ProcessedData, Transaction, TransactionUpdate } from '@/types/transactions';
import { isElviTransaction, isZuweisungTransaction } from '@/lib/specialCategoryUtils';
import { UpdateSummary } from '../costs/update-summary';

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

interface UpdateSummaryData {
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  errorCount: number;
  details?: {
    new: string[];
    updated: string[];
    unchanged: string[];
    errors: string[];
  };
}

// Generate a stable fingerprint for transaction matching across exports
function generateTransactionFingerprint(transaction: Transaction): string {
  // Round amount to 2 decimal places to handle floating point issues
  const amount = typeof transaction.amount === 'number' 
    ? parseFloat(transaction.amount.toFixed(2))
    : parseFloat(String(transaction.amount)).toFixed(2);
  
  // Combine stable properties to create a unique fingerprint
  return `${transaction.projectCode}_${transaction.internalCode}_${amount}_${transaction.personReference || ''}`;
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
  // Use utility functions to check special transaction types
  const is600 = isElviTransaction(transaction);
  const is23152 = isZuweisungTransaction(transaction);
  
  // Generate a safe document number that won't have undefined
  const docNumber = transaction.documentNumber || `NODOC-${Date.now()}-${index}`;
  
  // Generate a safe ID that won't have undefined
  const safeId = transaction.id && !transaction.id.includes('undefined') 
    ? transaction.id 
    : `${transaction.projectCode}-${transaction.year}-${docNumber}-${index}`;
  
  // Generate the fingerprint for this transaction (for matching)
  const fingerprint = generateTransactionFingerprint(transaction);
    
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
      categoryCode: transaction.categoryCode,
      fingerprint: fingerprint
    }
  };
}

export function DatabaseSaver({ processedData, isVerified, onSaveComplete }: DatabaseSaverProps) {
  const [saving, setSaving] = useState(false);
  const [updateSummary, setUpdateSummary] = useState<UpdateSummaryData | null>(null);
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

  // Helper function to compare transactions and determine what needs updating
  const compareTransactions = (newTransaction: any, existingTransaction: any): Partial<TransactionUpdate> => {
    const updates: Partial<TransactionUpdate> = {};
    
    // Create temporary transaction objects to use with the utility functions
    const newTx = { ...newTransaction, internalCode: newTransaction.internalCode || '' } as Transaction;
    const existingTx = { ...existingTransaction, internalCode: existingTransaction.internalCode || '' } as Transaction;
    
    // Check if the transaction is/was an ELVI transaction (600)
    const wasElvi = isElviTransaction(existingTx);
    const isStillElvi = isElviTransaction(newTx);
    
    // If transaction was ELVI but now has a proper category, update it
    if (wasElvi && !isStillElvi && newTransaction.categoryCode) {
      updates.categoryId = newTransaction.categoryId;
      updates.categoryCode = newTransaction.categoryCode;
      updates.status = 'completed';
    }
    
    // For normal transactions, check for key field changes
    if (!wasElvi || isStillElvi) {
      // Fields to compare for changes
      const compareFields = [
        'amount', 'description', 'categoryCode', 'status', 
        'documentNumber', 'personReference', 'details'
      ];
      
      compareFields.forEach(field => {
        // Skip nullish values in new transaction
        if (newTransaction[field] === null || newTransaction[field] === undefined) {
          return;
        }
        
        // If field differs, add to updates
        if (String(newTransaction[field]) !== String(existingTransaction[field])) {
          updates[field as keyof TransactionUpdate] = newTransaction[field];
        }
      });
    }
    
    // Check for status changes - especially important for previously unprocessed transactions
    if (existingTransaction.status === 'unprocessed' && 
        newTransaction.status && 
        newTransaction.status !== 'unprocessed') {
      updates.status = newTransaction.status;
    }
    
    // Check for 23152 special transactions - these may need special handling
    if (isZuweisungTransaction(newTx) || isZuweisungTransaction(existingTx)) {
      // If transaction is now 23152, mark it as special
      if (isZuweisungTransaction(newTx) && !existingTransaction.requiresSpecialHandling) {
        updates.requiresSpecialHandling = true;
      }
    }
    
    return updates;
  };

  const handleCloseSummary = () => {
    setUpdateSummary(null);
  };

  const handleSave = async () => {
    if (!processedData || !isVerified || saving) return;

    setSaving(true);
    let successCount = 0;
    let updateCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    const summary = {
      new: [] as string[],
      updated: [] as string[],
      unchanged: [] as string[],
      errors: [] as string[]
    };

    try {
      // First check if this is a first import (no existing transactions in DB)
      const existingCountResponse = await fetch('/api/transactions/count');
      const { count: existingCount } = await existingCountResponse.json();
      const isFirstImport = existingCount === 0;
      
      // Get all transactions to process
      const allTransactions = [
        ...processedData.transactions,
        ...processedData.specialTransactions
      ];

      // Track processed fingerprints to prevent deduplication within the batch
      const processedFingerprints = new Set<string>();

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
            summary.errors.push(`Invalid transaction: ${transaction.id}`);
            continue;
          }

          try {
            // Use the index when preparing the data
            const preparedData = prepareTransactionData(transaction, i);
            const fingerprint = generateTransactionFingerprint(transaction);
            
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

            // For first import OR if we haven't seen this fingerprint in this batch yet
            if (isFirstImport || !processedFingerprints.has(fingerprint)) {
              // Add to processed fingerprints to prevent duplicates in this batch
              processedFingerprints.add(fingerprint);
              
              // If it's first import, don't bother checking for existing transactions
              if (isFirstImport) {
                // Create new transaction directly without checking
                const response = await fetch('/api/transactions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...preparedData,
                    metadata: {
                      ...preparedData.metadata,
                      fingerprint: fingerprint,
                      isFirstImport: true  // Flag to prevent duplicate checking on the server
                    }
                  })
                });

                if (!response.ok) {
                  throw new Error(await response.text());
                }

                successCount++;
                summary.new.push(`${preparedData.id} (${preparedData.internalCode})`);
              } else {
                // Not first import, check for existing transactions by fingerprint
                const checkResponse = await fetch(`/api/transactions/check-fingerprint`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    id: preparedData.id,
                    fingerprint: fingerprint
                  })
                });
                
                const checkResult = await checkResponse.json();
                
                if (checkResult.found) {
                  // Transaction exists - check for updates needed
                  const existingTransaction = checkResult.details;
                  const updates = compareTransactions(preparedData, existingTransaction);
                  
                  if (Object.keys(updates).length > 0) {
                    // There are differences - update the transaction
                    const response = await fetch(`/api/transactions/${existingTransaction.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...updates,
                        previousState: {
                          categoryCode: existingTransaction.categoryCode,
                          status: existingTransaction.status
                        }
                      })
                    });

                    if (!response.ok) {
                      throw new Error(await response.text());
                    }
                    
                    updateCount++;
                    summary.updated.push(
                      `${preparedData.id} (${preparedData.internalCode}): ${Object.keys(updates).join(', ')}`
                    );
                  } else {
                    // No differences - skip
                    skippedCount++;
                    summary.unchanged.push(preparedData.id);
                  }
                } else {
                  // Transaction doesn't exist - create new
                  const response = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...preparedData,
                      metadata: {
                        ...preparedData.metadata,
                        fingerprint: fingerprint
                      }
                    })
                  });

                  if (!response.ok) {
                    throw new Error(await response.text());
                  }

                  successCount++;
                  summary.new.push(`${preparedData.id} (${preparedData.internalCode})`);
                }
              }
            } else {
              // Skip this transaction as we've already processed one with the same fingerprint in this batch
              skippedCount++;
              summary.unchanged.push(`${preparedData.id} (duplicate within import batch)`);
            }
          } catch (error) {
            console.error('Error processing transaction:', error);
            errorCount++;
            summary.errors.push(`Error with ${transaction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      
      // Set update summary
      setUpdateSummary({
        newCount: successCount,
        updatedCount: updateCount,
        unchangedCount: skippedCount,
        errorCount: errorCount,
        details: {
          new: summary.new,
          updated: summary.updated,
          unchanged: summary.unchanged,
          errors: summary.errors
        }
      });
      
      onSaveComplete(`Processed: ${successCount} new, ${updateCount} updated, ${skippedCount} unchanged, ${errorCount} failed`);
    } catch (error) {
      onSaveComplete(`Save process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button 
        onClick={handleSave} 
        disabled={!processedData || !isVerified || saving}
        variant="secondary"
        className={`${isVerified ? 'bg-green-500 text-white hover:bg-green-700' : ''}`}
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Processing...' : 'Save to Database'}
      </Button>
      
      {updateSummary && (
        <UpdateSummary 
          summary={updateSummary} 
          onClose={handleCloseSummary} 
        />
      )}
    </>
  );
}