import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '@/lib/store';
import { AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CostsSummary } from './costs-summary';
import { TransactionList } from './transaction-list';
import { InspectMode } from './inspect-mode';
import { CostVerification } from './cost-verification';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProcessedData, Transaction, TransactionUpdate } from '@/types/transactions';
import { DatabaseSaver } from '../database/database-saver';
import { Category } from '@/types/budget';
import { MissingEntriesList } from './missing-enteries/missing-entries';
import { InquiryList } from '../budget/inquiry-list';
import { DbExport } from '../database/db-export';

export function CostsUpload() {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);
  const { categories, setCosts, setInquiries } = useFinanceStore();

  useEffect(() => {
    // Fetch existing transactions when component mounts
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

        if (regular.length || special.length) {
          const data = {
            transactions: regular,
            specialTransactions: special,
            yearlyTotals: calculateYearlyTotals(regular, categories)
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
  }, [categories, setCosts, setInquiries]);

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
      });
      
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
    setIsVerified(true);
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
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="w-64"
        />
        <CostVerification 
          processedData={processedData}
          categories={categories}
          onVerificationComplete={handleVerificationComplete}
        />
        <DatabaseSaver 
          processedData={processedData}
          isVerified={isVerified}
          onSaveComplete={handleSaveComplete}
        />
        <DbExport hasData={processedData !== null} />
      </div>

        {uploadStatus && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadStatus}</AlertDescription>
          </Alert>
        )}

        {processedData && (
          <div className="mt-4">
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
                  />
                </InspectMode>
              </TabsContent>

                <TabsContent value="details">
                <TransactionList 
                  initialTransactions={processedData.transactions}
                  categories={categories}
                />
                </TabsContent>

                <TabsContent value="special">
                <TransactionList 
                  initialTransactions={processedData.specialTransactions}
                  categories={categories}
                  isSpecial={true}
                />
                </TabsContent>

              <TabsContent value="missing">
                <MissingEntriesList
                  transactions={processedData.transactions}
                  categories={categories}
                  onTransactionUpdate={handleTransactionUpdate}
                />
              </TabsContent>

              <TabsContent value="inquiries">
                <InquiryList />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function calculateYearlyTotals(transactions: Transaction[], categories: Category[]) {
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

function processTransactions(rows: any[], categories: Category[]): ProcessedData {
  const transactions = rows
    .filter((row: any) => row['Jahr'] && row['Betrag'])
    .map((row: any) => {
      const internalCode = row['Konto (KoArt)'].toString();
      const transactionType = row['Buchungsart (Art)'];
      const requiresSpecialHandling = 
        transactionType === 'IVMC-Hochr.' || 
        internalCode === '23152';

      const internalCodeNum = internalCode.padStart(4, '0');
      const categoryCode = `F${internalCodeNum}`;
      const matchingCategory = !requiresSpecialHandling ? 
        categories.find(cat => cat.code === categoryCode) : null;

      const parentCategory = matchingCategory?.parentId ? 
        categories.find(c => c.id === matchingCategory.parentId) : null;

      const transaction: Transaction = {
        id: `${row['Projekt (KTR)']}-${row['Jahr']}-${row['BelegNr (BelegNr)']}`,
        projectCode: row['Projekt (KTR)'].toString(),
        year: parseInt(row['Jahr']),
        amount: parseFloat(row['Betrag']),
        internalCode,
        description: row['Bezeichnung (Konto_Bez)'],
        costGroup: row['Kontengruppe (KoArt_GR)'],
        transactionType,
        documentNumber: row['BelegNr (BelegNr)']?.toString(),
        bookingDate: new Date(row['BuchDat (Buch_Dat)'] || row['Erstellungsdatum']),
        personReference: row['Grund1 (Grund1)'],
        details: row['Grund2 (Grund2)'],
        invoiceDate: row['RechDat (Rech_dat)'] ? new Date(row['RechDat (Rech_dat)']) : null,
        invoiceNumber: row['RechNr (Rech_Nr)'],
        paymentPartner: row['Zahlungspartner (Zahlungsp)'],
        internalAccount: row['koa (koa)']?.toString(),
        accountLabel: row['koa-Bezeichnung (koa_Bez)'],
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

  const specialTransactions = transactions.filter(t => t.requiresSpecialHandling);
  const regularTransactions = transactions.filter(t => !t.requiresSpecialHandling);
  const yearlyTotals = calculateYearlyTotals(regularTransactions, categories);

  return { 
    transactions: regularTransactions, 
    yearlyTotals, 
    specialTransactions 
  };
}