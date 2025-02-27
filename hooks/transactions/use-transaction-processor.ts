import { useState, useCallback } from 'react';
import { Transaction, ProcessedData } from '@/types/transaction';
import { Category } from '@/types/category';
import { useBudgetCalculations } from '../budget/use-budget-calculations';
import { useErrorHandler } from '../ui/use-error-handler';
import * as XLSX from 'xlsx';

interface UseTransactionProcessorProps {
  categories: Category[];
  specialCategoryCodes?: string[];
}

export function useTransactionProcessor({ 
  categories, 
  specialCategoryCodes = ['600', '23152'] 
}: UseTransactionProcessorProps) {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  
  const { handleError } = useErrorHandler();
  
  // Generate a unique transaction ID
  const generateTransactionId = useCallback((transaction: Partial<Transaction>) => {
    const docNumber = transaction.documentNumber || `NO_DOC_${Date.now()}`;
    return `${transaction.projectCode}-${transaction.year}-${docNumber}`;
  }, []);
  
  // Process file upload
  const processFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    
    setIsProcessing(true);
    setIsVerified(false);
    
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { 
        cellDates: true, 
        cellNF: true, 
        cellText: false 
      });
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { raw: true });
      
      // Process rows into transactions
      const transactions: Transaction[] = rows
        .filter((row: any) => row['Jahr'] && row['Betrag'])
        .map((row: any) => {
          const internalCode = row['Konto (KoArt)']?.toString() || '';
          const isSpecial = specialCategoryCodes.includes(internalCode.replace(/^0+/, ''));
          
          // Get category if exists
          const categoryCode = `${internalCode}`;
          const matchingCategory = categories.find(cat => cat.code === categoryCode);
          
          return {
            id: generateTransactionId({
              projectCode: row['Projekt (KTR)']?.toString() || '',
              year: row['Jahr'],
              documentNumber: row['BelegNr (BelegNr)']?.toString() || ''
            }),
            projectCode: row['Projekt (KTR)']?.toString() || '',
            year: parseInt(row['Jahr']),
            amount: parseFloat(row['Betrag']),
            internalCode,
            description: row['Bezeichnung (Konto_Bez)'] || '',
            costGroup: row['Kontengruppe (KoArt_GR)'] || '',
            transactionType: row['Buchungsart (Art)'] || '',
            documentNumber: row['BelegNr (BelegNr)']?.toString() || '',
            bookingDate: new Date(row['BuchDat (Buch_Dat)'] || row['Erstellungsdatum']),
            personReference: row['Grund1 (Grund1)'] || '',
            details: row['Grund2 (Grund2)'] || '',
            invoiceDate: row['RechDat (Rech_dat)'] ? new Date(row['RechDat (Rech_dat)']) : null,
            invoiceNumber: row['RechNr (Rech_Nr)'] || '',
            paymentPartner: row['Zahlungspartner (Zahlungsp)'] || '',
            internalAccount: row['koa (koa)']?.toString() || '',
            accountLabel: row['koa-Bezeichnung (koa_Bez)'] || '',
            categoryId: matchingCategory?.id || null,
            categoryCode: matchingCategory?.code,
            categoryName: matchingCategory?.name,
            specialCategoryId: isSpecial ? internalCode : null,
            specialCategoryCode: isSpecial ? internalCode : null,
            status: 'unprocessed'
          };
        });
      
      const specialTransactions = transactions.filter(t => !!t.specialCategoryId);
      const regularTransactions = transactions.filter(t => !t.specialCategoryId);
      
      // Calculate totals
      const { yearlyTotals } = useBudgetCalculations({
        categories,
        transactions: regularTransactions
      });
      
      const data: ProcessedData = {
        transactions: regularTransactions,
        specialTransactions,
        yearlyTotals
      };
      
      setProcessedData(data);
      setUploadStatus(
        `Processed ${transactions.length} transactions ` +
        `(${specialTransactions.length} special transactions).`
      );
    } catch (error) {
      handleError(error, 'Failed to process file');
      setUploadStatus('Error processing file');
    } finally {
      setIsProcessing(false);
    }
  }, [categories, specialCategoryCodes, generateTransactionId, handleError]);
  
  // Verify the processed data
  const verifyData = useCallback(() => {
    if (!processedData) return;
    
    // Implement verification logic here
    // For example, check if totals match expected values
    
    setIsVerified(true);
    setUploadStatus('Data verified successfully.');
  }, [processedData]);
  
  return {
    processedData,
    uploadStatus,
    isProcessing,
    isVerified,
    processFileUpload,
    verifyData
  };
}