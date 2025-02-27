import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFinanceStore } from '@/lib/store';
import { useTransactionOperations } from '@/lib/hooks/useTransactionOperations';
import { AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { UploadControls } from './upload-controls';

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

interface YearlyTotalCategory {
  spent: number;
  budget: number;
  remaining: number;
  transactions: Transaction[];
  isSpecialCategory: boolean;
}

type YearlyTotalRecord = Record<string, Record<string, YearlyTotalCategory>>;

export function CostsUpload() {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);
  
  const { 
    categories, 
    setCosts, 
    setInquiries 
  } = useFinanceStore();
  
  const { 
    calculateYearlyTotals 
  } = useTransactionOperations();

  useEffect(() => {
    const fetchTransactions = async () => {
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
  
        setInquiries(inquiries);

        const regularTransactions = regular.transactions || [];
        const specialTransactions = special.transactions || [];

        if (regularTransactions.length || specialTransactions.length) {
          const data = {
            transactions: regularTransactions,
            specialTransactions: specialTransactions,
            yearlyTotals: calculateYearlyTotals(regularTransactions, categories)
          };
          setProcessedData(data);
          setCosts(data);
          setIsVerified(true);
          setUploadStatus('Loaded existing transactions from database');
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setUploadStatus('Error loading saved transactions');
      }
    };

    fetchTransactions();
  }, [categories, setCosts, setInquiries, calculateYearlyTotals]);

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
      setProcessedData(data);
      setCosts(data);
   
      setUploadStatus(
        `Processed ${data.transactions.length + data.specialTransactions.length} transactions ` +
        `(${data.specialTransactions.length} special transactions).`
      );
    } catch (error) {
      console.error('File processing error:', error);
      setUploadStatus(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleVerificationComplete = (isValid: boolean, message: string) => {
    setIsVerified(isValid);
    setUploadStatus(message);
  };

  const handleSaveComplete = (message: string) => {
    setUploadStatus(message);
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
        />

        {uploadStatus && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadStatus}</AlertDescription>
          </Alert>
        )}

        {processedData && (
          <div className="mt-4">
            <CostsTabs 
              processedData={processedData}
              categories={categories}
              onTransactionUpdate={handleTransactionUpdate}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function calculateYearlyTotals(transactions: Transaction[], categories: Category[]): YearlyTotalRecord {
  const yearlyTotals: YearlyTotalRecord = {};
  const years = [...new Set(transactions.map(t => t.year.toString()))];
  
  years.forEach(year => {
    yearlyTotals[year] = {};
    // Include ALL categories in the yearly totals for tracking
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

function processTransactions(rows: TransactionRow[], categories: Category[]): ProcessedData {
  const transactions = rows
    .filter((row) => row['Jahr'] && row['Betrag'])
    .map((row) => {
      const internalCode = row['Konto (KoArt)']?.toString() || '';
      const transactionType = row['Buchungsart (Art)'];
      
      // Debug logging to check what's causing the special transaction classification
      console.log('Processing transaction:', {
        id: `${row['Projekt (KTR)']}-${row['Jahr']}-${row['BelegNr (BelegNr)']}`,
        transactionType,
        internalCode,
        description: row['Bezeichnung (Konto_Bez)']
      });
      
      // More explicit special handling check
      const requiresSpecialHandling = 
        (transactionType === 'IVMC-Hochr.') || 
        (internalCode === '23152');
      
      console.log(`Transaction requires special handling: ${requiresSpecialHandling}`);

      const internalCodeNum = internalCode.padStart(4, '0');
      const categoryCode = `F${internalCodeNum}`;
      const matchingCategory = !requiresSpecialHandling ? 
        categories.find(cat => cat.code === categoryCode) : null;

      const parentCategory = matchingCategory?.parentId ? 
        categories.find(c => c.id === matchingCategory.parentId) : null;

      const transaction: Transaction = {
        id: `${row['Projekt (KTR)']}-${row['Jahr']}-${row['BelegNr (BelegNr)']}`,
        projectCode: row['Projekt (KTR)']?.toString() || '',
        year: parseInt(row['Jahr'].toString()),
        amount: parseFloat(row['Betrag'].toString()),
        internalCode,
        description: row['Bezeichnung (Konto_Bez)']?.toString() || '',
        costGroup: row['Kontengruppe (KoArt_GR)']?.toString() || '',
        transactionType: transactionType?.toString() || '',
        documentNumber: row['BelegNr (BelegNr)']?.toString() || '',
        bookingDate: new Date(row['BuchDat (Buch_Dat)'] || row['Erstellungsdatum'] || new Date()),
        personReference: row['Grund1 (Grund1)']?.toString() || '',
        details: row['Grund2 (Grund2)']?.toString() || '',
        invoiceDate: row['RechDat (Rech_dat)'] ? new Date(row['RechDat (Rech_dat)']) : null,
        invoiceNumber: row['RechNr (Rech_Nr)']?.toString() || '',
        paymentPartner: row['Zahlungspartner (Zahlungsp)']?.toString() || '',
        internalAccount: row['koa (koa)']?.toString() || '',
        accountLabel: row['koa-Bezeichnung (koa_Bez)']?.toString() || '',
        categoryId: matchingCategory?.id || '',
        categoryCode: matchingCategory?.code,
        categoryName: matchingCategory?.name,
        requiresSpecialHandling,
        categoryParentCode: parentCategory?.code,
        categoryParentId: parentCategory?.id,
        status: 'unprocessed'
      };

      return transaction;
    });

  // Filter special transactions with clear logging
  const specialTransactions = transactions.filter(t => {
    console.log(`Checking special handling for ${t.id}: ${t.requiresSpecialHandling}`);
    return t.requiresSpecialHandling;
  });
  const regularTransactions = transactions.filter(t => !t.requiresSpecialHandling);
  
  console.log(`Total transactions: ${transactions.length}`);
  console.log(`Regular transactions: ${regularTransactions.length}`);
  console.log(`Special transactions: ${specialTransactions.length}`);
  
  const yearlyTotals = calculateYearlyTotals(regularTransactions, categories);

  return { 
    transactions: regularTransactions, 
    yearlyTotals, 
    specialTransactions 
  };
}