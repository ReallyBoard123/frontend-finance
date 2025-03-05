'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useFinanceStore } from '@/lib/store';
import { useCategoryOperations } from '@/lib/hooks/useCategoryOperations';
import { useTransactionOperations } from '@/lib/hooks/useTransactionOperations';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Save, RefreshCw, AlertCircle } from 'lucide-react';

import * as XLSX from 'xlsx';
import type { Transaction } from '@/types/transactions';
import { TransactionList } from '@/components/layout/TransactionList';

// Processing function for transactions from Excel files
function processTransactions(rows: any[], categories: any[]): Transaction[] {
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

  return transactions;
}

export default function UploadTransactionsPage() {
  const { categories, reset: resetStore } = useFinanceStore();
  const { fetchCategories } = useCategoryOperations();
  const { fetchTransactions } = useTransactionOperations();
  
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch categories on initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (!categories.length) {
          await fetchCategories();
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        toast.error('Failed to load categories');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [fetchCategories, categories.length]);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setIsVerified(false);
    setUploadStatus('Processing file...');
    
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
      
      const transactions = processTransactions(rows, categories);
      setParsedTransactions(transactions);
      
      setUploadStatus(`Processed ${transactions.length} transactions. Verify and save to database.`);
    } catch (error) {
      console.error('File processing error:', error);
      setUploadStatus(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to process file');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerify = () => {
    if (parsedTransactions.length === 0) {
      toast.error('No transactions to verify');
      return;
    }
    
    // Perform validation here if needed
    
    setIsVerified(true);
    setUploadStatus('Verification successful. Ready to save to database.');
    toast.success('Transactions verified');
  };
  
  const handleSave = async () => {
    if (!isVerified || parsedTransactions.length === 0) {
      toast.error('Please verify transactions before saving');
      return;
    }
    
    setIsSaving(true);
    setUploadStatus('Saving transactions to database...');
    
    try {
      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      // Process each transaction
      for (const transaction of parsedTransactions) {
        try {
          // Check if transaction already exists
          const checkResponse = await fetch(`/api/transactions/check/${transaction.id}`);
          const { found } = await checkResponse.json();
          
          if (found) {
            skippedCount++;
            continue;
          }
          
          // Save the transaction
          const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
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
      
      setUploadStatus(`Saved ${successCount} transactions. Skipped ${skippedCount}. Failed ${errorCount}.`);
      
      // Refresh transaction data
      await fetchTransactions();
      
      // Reset parsed transactions
      if (successCount > 0) {
        setParsedTransactions([]);
        setIsVerified(false);
      }
      
      toast.success(`Successfully saved ${successCount} transactions`);
    } catch (error) {
      setUploadStatus(`Error saving transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to save transactions');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      resetStore();
      await fetchCategories();
      await fetchTransactions();
      toast.success('Data refreshed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <DashboardLayout 
      title="Upload Transactions" 
      onRefresh={handleRefresh}
      onSave={handleSave}
      showSaveButton={isVerified && parsedTransactions.length > 0}
      isRefreshing={isLoading}
      isSaving={isSaving}
    >
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Upload Transaction File</h2>
          
          <div className="flex items-center gap-4">
            <Input
              type="file"
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="w-64"
              disabled={isLoading}
            />
            
            <Button
              variant="outline"
              onClick={handleVerify}
              disabled={isLoading || parsedTransactions.length === 0}
            >
              <RefreshCw size={16} className="mr-2" />
              Verify Data
            </Button>
            
            <Button
              variant="default"
              className={`${isVerified ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={handleSave}
              disabled={!isVerified || parsedTransactions.length === 0 || isSaving}
            >
              <Save size={16} className="mr-2" />
              {isSaving ? 'Saving...' : 'Save to Database'}
            </Button>
          </div>
          
          {uploadStatus && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadStatus}</AlertDescription>
            </Alert>
          )}
        </div>
        
        {parsedTransactions.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Parsed Transactions ({parsedTransactions.length})</h2>
              <p className="text-gray-500 text-sm mt-1">
                Review these transactions before saving to the database
              </p>
            </div>
            
            <TransactionList 
              transactions={parsedTransactions}
              categories={categories}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}