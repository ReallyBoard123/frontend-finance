// components/budget/category-uploader.tsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUploader } from "@/components/common/ui/file-uploader";
import { ActionButton } from "@/components/common/ui/action-button";
import { DataTable } from "@/components/common/data-table/data-table";
import { Save, AlertTriangle } from 'lucide-react';
import { useCategoryOperations } from '@/lib/hooks/useCategoryOperations';

interface ProcessedCategory {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  parent_code: string | null;
  budgets: Record<string, number>;
  isLeaf: boolean;
  isSpecialCategory?: boolean;
  validation?: {
    hasDiscrepancy: boolean;
    expectedTotal: Record<string, number>;
    calculatedTotal: Record<string, number>;
  };
}

interface CategoryRow {
  category_code: string;
  name: string;
  parent_code?: string;
  [key: string]: unknown;
}

interface SavedCategory {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  budgets: Record<string, number>;
  isLeaf: boolean;
  [key: string]: unknown;
}

export function CategoryUploader() {
  const [uploadStatus, setUploadStatus] = useState('');
  const [processedCategories, setProcessedCategories] = useState<ProcessedCategory[]>([]);
  const [hasDiscrepancies, setHasDiscrepancies] = useState(false);
  const { isLoading, setCategories } = useCategoryOperations();

  const validateParentTotals = (categories: ProcessedCategory[]): ProcessedCategory[] => {
    const years = ["2023", "2024", "2025"];
    
    // Create a map of parent codes to their children
    const parentToChildren = new Map<string, ProcessedCategory[]>();
    categories.forEach(cat => {
      if (cat.parent_code) {
        if (!parentToChildren.has(cat.parent_code)) {
          parentToChildren.set(cat.parent_code, []);
        }
        parentToChildren.get(cat.parent_code)?.push(cat);
      }
    });

    // Validate each parent's totals
    const validatedCategories = categories.map(category => {
      if (category.isLeaf || category.isSpecialCategory) return category;
  
      const children = parentToChildren.get(category.code) || [];
      const calculatedTotals: Record<string, number> = {};
      
      years.forEach(year => {
        calculatedTotals[year] = children
          .filter(child => !child.isSpecialCategory) // Skip special categories
          .reduce((sum, child) => sum + (child.budgets[year] || 0), 0);
      });

      const hasDiscrepancy = years.some(year => 
        Math.abs(calculatedTotals[year] - category.budgets[year]) > 0.01
      );

      return {
        ...category,
        validation: {
          hasDiscrepancy,
          expectedTotal: { ...category.budgets },
          calculatedTotal: calculatedTotals
        }
      };
    });

    setHasDiscrepancies(validatedCategories.some(cat => cat.validation?.hasDiscrepancy));
    return validatedCategories;
  };

  const processCategories = (rows: CategoryRow[]): ProcessedCategory[] => {
    const categories = rows.map((row, index) => ({
      id: `temp-${index}`, // Add temporary id
      code: row.category_code,
      name: row.name,
      parentId: null,
      parent_code: row.parent_code || null,
      budgets: {
        "2023": parseFloat(row["2023"] as string) || 0,
        "2024": parseFloat(row["2024"] as string) || 0,
        "2025": parseFloat(row["2025"] as string) || 0
      },
      isLeaf: !row.name.toLowerCase().includes('summe')
    }));
  
    return validateParentTotals(categories);
  };

  const handleFileSelect = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet) as CategoryRow[];

      const categories = processCategories(rows);
      setProcessedCategories(categories);
      setUploadStatus('Categories processed. Review and save when ready.');
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadStatus('Error processing file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleSave = async () => {
    if (hasDiscrepancies) {
      setUploadStatus('Please resolve budget discrepancies before saving');
      return;
    }
    
    const categoryMap = new Map<string, SavedCategory>();

    try {
      // First pass: Create all categories
      for (const category of processedCategories) {
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: category.code,
            name: category.name,
            parentId: null,
            budgets: category.budgets,
            isLeaf: category.isLeaf
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const savedCategory = await response.json() as SavedCategory;
        categoryMap.set(category.code, savedCategory);
      }

      // Second pass: Update parent relationships
      for (const category of processedCategories) {
        if (category.parent_code) {
          const savedCategory = categoryMap.get(category.code);
          const parentCategory = categoryMap.get(category.parent_code);

          if (savedCategory && parentCategory) {
            const response = await fetch(`/api/categories/${savedCategory.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                parentId: parentCategory.id
              }),
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const updatedCategory = await response.json() as SavedCategory;
            categoryMap.set(category.code, updatedCategory);
          }
        }
      }

      const savedCategories = Array.from(categoryMap.values());
      setCategories(savedCategories);
      setUploadStatus('Categories saved successfully');
      setProcessedCategories([]);
    } catch (error) {
      console.error('Error saving categories:', error);
      setUploadStatus('Error saving categories: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'Code',
      cell: (category: ProcessedCategory) => category.code
    },
    {
      key: 'name',
      header: 'Name',
      cell: (category: ProcessedCategory) => category.name
    },
    {
      key: 'parent',
      header: 'Parent',
      cell: (category: ProcessedCategory) => category.parent_code || '-'
    },
    {
      key: 'isLeaf',
      header: 'Is Leaf',
      cell: (category: ProcessedCategory) => category.isLeaf ? 'Yes' : 'No'
    },
    {
      key: '2023',
      header: '2023',
      cell: (category: ProcessedCategory) => 
        new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(category.budgets["2023"])
    },
    {
      key: '2024',
      header: '2024',
      cell: (category: ProcessedCategory) => 
        new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(category.budgets["2024"])
    },
    {
      key: '2025',
      header: '2025',
      cell: (category: ProcessedCategory) =>
        new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(category.budgets["2025"])
    },
    {
      key: 'status',
      header: 'Status',
      cell: (category: ProcessedCategory) => category.validation?.hasDiscrepancy ? (
        <div className="flex items-center text-red-600">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Sum mismatch
        </div>
      ) : null
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <FileUploader
            onFileSelect={handleFileSelect}
            accept=".xlsx,.xls"
            label="Upload Categories"
            className="w-64"
          />
          <ActionButton 
            onClick={handleSave}
            disabled={processedCategories.length === 0 || isLoading || hasDiscrepancies}
            loading={isLoading}
            icon={Save}
            label="Save Categories"
            variant="outline"
          />
        </div>

        {uploadStatus && (
          <Alert variant={hasDiscrepancies ? "destructive" : "default"}>
            <AlertDescription>{uploadStatus}</AlertDescription>
          </Alert>
        )}

        {processedCategories.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Preview ({processedCategories.length} categories)</h3>
            <DataTable
              data={processedCategories}
              columns={columns}
              rowClassName={(category) => category.validation?.hasDiscrepancy ? 'bg-red-50' : ''}
              emptyMessage="No categories to display"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}