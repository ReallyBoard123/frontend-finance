// components/database/db-export.tsx
import React from 'react';
import { Download } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface DbExportProps {
  hasData: boolean;
}

export function DbExport({ hasData }: DbExportProps) {
  const handleExport = async () => {
    try {
      const response = await fetch('/api/export');
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transactions-export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (!hasData) return null;

  return (
    <Button onClick={handleExport} variant="outline" className="gap-2">
      <Download className="h-4 w-4" />
      Export DB
    </Button>
  );
}