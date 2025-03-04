import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFinanceStore } from '@/lib/store';
import { useTransactionOperations } from '@/lib/hooks/useTransactionOperations';
import { AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { UploadControls } from './upload-controls';
import { NewTransactionsConfirmation } from './new-transactions-confirmation';

import type { ProcessedData, Transaction, TransactionUpdate } from '@/types/transactions';
import { CostsTabs } from './costs-tabs';
import { Category } from '@/types/budget';


interface TransactionRow {
  'Jahr': string | number;
  'Betrag': string | number;
  'Konto (KoArt)'?: string;
  'Buchungsart (Art)'?: string;
  'Projekt (KTR)'?: string;
  'BelegNr (BelegNr)'?: string;
  'Bezeichnung (Konto_Bez)'?: string;
  'Kontengruppe (KoArt_GR)'?: string;
  'BuchDat (Buch_Dat)'?: string | Date;
  'Erstellungsdatum'?: string | Date;
  'Grund1 (Grund1)'?: string;
  'Grund2 (Grund2)'?: string;
  'RechDat (Rech_dat)'?: string | Date;
  'RechNr (Rech_Nr)'?: string;
  'Zahlungspartner (Zahlungsp)'?: string;
  'koa (koa)'?: string;
  'koa-Bezeichnung (koa_Bez)'?: string;
  [key: string]: unknown;
}

export function CostsUpload() {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [newTransactions, setNewTransactions] = useState<Transaction[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  // Store only the new transactions separately
  const [selectedNewTransactions, setSelectedNewTransactions] = useState<Transaction[]>([]);
  
  const { 
    categories, 
    costs,
    setCosts, 
    setInquiries 
  } = useFinanceStore();
  
  const { 
    calculateYearlyTotals 
  } = useTransactionOperations();

  useEffect(() => {
    const fetchTransactions = async () => {
      // Prevent multiple fetches
      if (initialFetchDone) return;
    
      try {
        const [regularRes, specialRes, inquiriesRes] = await Promise.all([
          fetch('/api/transactions?type=regular'),
          fetch('/api/transactions?type=special'),
          fetch('/api/transaction-inquiries')
        ]);
        
        const [regular, special, inquiries] = await Promise.all([
          regularRes.json(),
          specialRes.json(),
          inquiriesRes.json()
        ]);
    
        // Store the current timestamp as last DB check
        const now = Date.now();
        setInquiries(inquiries);
    
        const regularTransactions = regular.transactions || [];
        const specialTransactions = special.transactions || [];
    
        // If the database has no transactions, make sure to clear the store
        if (regularTransactions.length === 0 && specialTransactions.length === 0) {
          setCosts({
            transactions: [],
            specialTransactions: [],
            yearlyTotals: {}
          });
          console.log("Database is empty - cleared local store");
        } else {
          const data = {
            transactions: regularTransactions,
            specialTransactions: specialTransactions,
            yearlyTotals: calculateYearlyTotals(regularTransactions, categories)
          };
          setCosts(data);
        }
        
        setProcessedData(costs);
        setIsVerified(true);
        setUploadStatus('Loaded existing transactions from database');
    
        // Mark initial fetch as complete
        setInitialFetchDone(true);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setUploadStatus('Error loading saved transactions');
        // Even if there's an error, mark initial fetch as complete
        setInitialFetchDone(true);
      }
    };

    fetchTransactions();
  }, [categories, setCosts, setInquiries, calculateYearlyTotals, initialFetchDone]);

  const identifyNewTransactions = async (uploadedTransactions: Transaction[]) => {
    try {
      // Check which transactions already exist in the database
      const response = await fetch('/api/transactions/check-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: uploadedTransactions })
      });
      
      if (!response.ok) {
        throw new Error('Failed to check transactions');
      }
      
      const { existingIds, newTransactions, matchedInquiries } = await response.json();
      
      // Process matched inquiries if any
      if (matchedInquiries && matchedInquiries.length > 0) {
        console.log('Found transactions with existing inquiries:', matchedInquiries.length);
        
        // Update transaction statuses for matched inquiries
        for (const match of matchedInquiries) {
          const transactionIndex = uploadedTransactions.findIndex(t => t.id === match.newId);
          if (transactionIndex >= 0) {
            // Preserve inquiry status
            uploadedTransactions[transactionIndex].status = match.originalTransaction.status || 'pending_inquiry';
            console.log(`Updated status for transaction ${match.newId} to ${uploadedTransactions[transactionIndex].status}`);
          }
        }
      }
      
      // Set new transactions for confirmation
      setNewTransactions(newTransactions);
      setShowConfirmation(newTransactions.length > 0);
      
      setUploadStatus(
        `Found ${newTransactions.length} new transactions out of ${uploadedTransactions.length} total`
      );
      
      return newTransactions;
    } catch (error) {
      console.error('Error identifying new transactions:', error);
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
   
    setIsVerified(false);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { 
        cellDates: true, 
        cellNF: true, 
        cellText: false 
      });
      
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { 
        raw: true 
      }) as TransactionRow[];
      
      const data = processTransactions(rows, categories);
      
      // Identify only the new transactions
      await identifyNewTransactions([...data.transactions, ...data.specialTransactions]);
      
      // Don't update processedData here - we'll do that after user selects transactions
    } catch (error) {
      console.error('File processing error:', error);
      setUploadStatus(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleConfirmNewTransactions = (selectedTransactions: Transaction[]) => {
    // Store only the selected new transactions for saving to database later
    setSelectedNewTransactions(selectedTransactions);
    
    // Create a data object that includes BOTH existing transactions AND the new ones
    const updatedData: ProcessedData = {
      // For regular transactions, merge existing with new non-special ones
      transactions: [
        ...(costs?.transactions || []),
        ...selectedTransactions.filter(t => !t.requiresSpecialHandling)
      ],
      // For special transactions, merge existing with new special ones
      specialTransactions: [
        ...(costs?.specialTransactions || []),
        ...selectedTransactions.filter(t => t.requiresSpecialHandling)
      ],
      // Calculate totals based on all transactions
      yearlyTotals: {} // We'll calculate this below
    };
    
    // Calculate yearly totals with all transactions
    updatedData.yearlyTotals = calculateYearlyTotals(updatedData.transactions, categories);
    
    // Update state
    setProcessedData(updatedData);
    setCosts(updatedData);
    setIsVerified(true);
    setShowConfirmation(false);
    
    setUploadStatus(
      `Added ${selectedTransactions.length} new transactions. Click "Verify Data" then "Save to Database".`
    );
  };

  const handleCancelNewTransactions = () => {
    setShowConfirmation(false);
    setNewTransactions([]);
    setSelectedNewTransactions([]);
  };

  const handleVerificationComplete = (isValid: boolean, message: string) => {
    setIsVerified(isValid);
    setUploadStatus(message);
  };

  const handleSaveComplete = (message: string) => {
    setUploadStatus(message);
    setSelectedNewTransactions([]);
  };

  const handleTransactionUpdate = async (transactionId: string, updates: TransactionUpdate) => {
    if (!processedData) return;

    try {
      // Update local state
      const updatedTransactions = processedData.transactions.map(transaction =>
        transaction.id === transactionId ? { ...transaction, ...updates } : transaction
      );

      // Update processed data
      const updatedData = {
        ...processedData,
        transactions: updatedTransactions,
        yearlyTotals: calculateYearlyTotals(updatedTransactions, categories)
      };

      setProcessedData(updatedData);
      setCosts(updatedData);

      // Update database
      await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      setUploadStatus('Transaction updated successfully');
    } catch (error) {
      console.error('Error updating transaction:', error);
      setUploadStatus('Failed to update transaction');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <UploadControls 
          onFileUpload={handleFileUpload}
          processedData={processedData}
          categories={categories}
          isVerified={isVerified}
          onVerificationComplete={handleVerificationComplete}
          onSaveComplete={handleSaveComplete}
          // Pass only the selected new transactions to save
          selectedNewTransactions={selectedNewTransactions}
        />

        {uploadStatus && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadStatus}</AlertDescription>
          </Alert>
        )}

        {showConfirmation && (
          <NewTransactionsConfirmation
            newTransactions={newTransactions}
            categories={categories}
            onConfirm={handleConfirmNewTransactions}
            onCancel={handleCancelNewTransactions}
          />
        )}

{processedData && !showConfirmation && (
  <div className="mt-4">
    <CostsTabs 
      processedData={processedData}
      categories={categories}
      onTransactionUpdate={handleTransactionUpdate}
      showVerticalTotals={false} // Set to false to prioritize horizontal totals
    />
  </div>
)}
      </CardContent>
    </Card>
  );
}

function processTransactions(rows: TransactionRow[], categories: Category[]): ProcessedData {
  const transactions = rows
    .filter((row) => row['Jahr'] && row['Betrag'])
    .map((row, index) => {
      const internalCode = row['Konto (KoArt)']?.toString() || '';
      const transactionType = row['Buchungsart (Art)'];
      const normalizedInternalCode = internalCode.replace(/^0+/, ''); // Remove leading zeros
      
      // Handle special cases
      const requiresSpecialHandling = 
        (transactionType === 'IVMC-Hochr.') || 
        (normalizedInternalCode === '23152');
        
      // For 600 (ELVI) we don't want to auto-assign any category
      const is600 = normalizedInternalCode === '600';

      const internalCodeNum = internalCode.padStart(4, '0');
      
      // Only try to find a matching category if it's not a special code
      const matchingCategory = (!requiresSpecialHandling && !is600) ? 
        categories.find(cat => cat.code === `F${internalCodeNum}`) : null;

      const parentCategory = matchingCategory?.parentId ? 
        categories.find(c => c.id === matchingCategory.parentId) : null;

      // Ensure document number is unique but stable
      const docNumber = row['BelegNr (BelegNr)']?.toString() || '';
      let stableDocNumber;
      
      // Generate document number based on type
      if (transactionType === 'IVMC-Hochr.') {
        // For IVMC entries, use the reference (e.g., "Gar", "Sin")
        const ref = row['Grund1 (Grund1)']?.toString() || '';
        stableDocNumber = `NODOC-${ref || index}`;
      } else if (docNumber) {
        // Use actual document number if available
        stableDocNumber = docNumber;
      } else {
        // For entries without document number, use reference or index
        const ref = row['Grund1 (Grund1)']?.toString() || '';
        stableDocNumber = `NODOC-${ref || index}`;
      }
      
      // IMPORTANT: Always include the index to ensure uniqueness
      const uniqueId = `${row['Projekt (KTR)']}-${row['Jahr']}-${stableDocNumber}-${index}`;

      // Format date consistently
      const bookingDate = row['BuchDat (Buch_Dat)'] || row['Erstellungsdatum'] || new Date();
      const formattedBookingDate = bookingDate instanceof Date ? 
                                  bookingDate : 
                                  new Date(bookingDate);

      const transaction: Transaction = {
        id: uniqueId,
        projectCode: row['Projekt (KTR)']?.toString() || '',
        year: parseInt(row['Jahr'].toString()),
        amount: parseFloat(row['Betrag'].toString()),
        internalCode,
        description: row['Bezeichnung (Konto_Bez)']?.toString() || '',
        costGroup: row['Kontengruppe (KoArt_GR)']?.toString() || '',
        transactionType: transactionType?.toString() || '',
        documentNumber: stableDocNumber,
        bookingDate: formattedBookingDate,
        personReference: row['Grund1 (Grund1)']?.toString() || '',
        details: row['Grund2 (Grund2)']?.toString() || '',
        invoiceDate: row['RechDat (Rech_dat)'] ? new Date(row['RechDat (Rech_dat)']) : null,
        invoiceNumber: row['RechNr (Rech_Nr)']?.toString() || '',
        paymentPartner: row['Zahlungspartner (Zahlungsp)']?.toString() || '',
        internalAccount: row['koa (koa)']?.toString() || '',
        accountLabel: row['koa-Bezeichnung (koa_Bez)']?.toString() || '',
        categoryId: matchingCategory?.id || null,
        categoryCode: matchingCategory?.code || null,
        categoryName: matchingCategory?.name,
        requiresSpecialHandling,
        categoryParentCode: parentCategory?.code,
        categoryParentId: parentCategory?.id,
        status: is600 ? 'unprocessed' : 'unprocessed',
        metadata: {
          needsReview: is600,
          originalInternalCode: internalCode
        }
      };

      return transaction;
    });

  // Filter special transactions 
  const specialTransactions = transactions.filter(t => t.requiresSpecialHandling);
  const regularTransactions = transactions.filter(t => !t.requiresSpecialHandling);
  
  const yearlyTotals = processTransactionTotals(regularTransactions, categories);

  return { 
    transactions: regularTransactions, 
    yearlyTotals, 
    specialTransactions 
  };
}

function processTransactionTotals(transactions: Transaction[], categories: Category[]) {
  const yearlyTotals: Record<string, Record<string, any>> = {};
  const years = [...new Set(transactions.map(t => t.year.toString()))];
  
  years.forEach(year => {
    yearlyTotals[year] = {};
    categories.forEach(category => {
      yearlyTotals[year][category.code] = {
        spent: 0,
        budget: category.budgets?.[year] || 0,
        remaining: category.budgets?.[year] || 0,
        transactions: [],
        isSpecialCategory: category.isSpecialCategory || false
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
}