// components/costs/upload-controls.tsx
import React from 'react';
import { Input } from "@/components/ui/input";
import { CostVerification } from './cost-verification';
import { DatabaseSaver } from '../database/database-saver';
import { DbExport } from '../database/db-export';
import type { ProcessedData, Transaction } from '@/types/transactions';
import type { Category } from '@/types/budget';
import ResetStoreButton from '../common/reset-store';

interface UploadControlsProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  processedData: ProcessedData | null;
  categories: Category[];
  isVerified: boolean;
  onVerificationComplete: (isValid: boolean, message: string) => void;
  onSaveComplete: (message: string) => void;
  selectedNewTransactions?: Transaction[];
}

export function UploadControls({
  onFileUpload,
  processedData,
  categories,
  isVerified,
  onVerificationComplete,
  onSaveComplete
}: UploadControlsProps) {
  return (
    <div className="flex items-center gap-4">
      <Input
        type="file"
        accept=".xlsx,.xls"
        onChange={onFileUpload}
        className="w-64"
      />
      <CostVerification 
        processedData={processedData}
        categories={categories}
        onVerificationComplete={onVerificationComplete}
      />
      <DatabaseSaver 
        processedData={processedData}
        isVerified={isVerified}
        onSaveComplete={onSaveComplete}
      />
      <DbExport hasData={processedData !== null} />
      <ResetStoreButton />
    </div>
  );
}