import React, { useState } from 'react';
import { useFinanceStore } from '@/lib/store';
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Upload, Save, Loader2, AlertTriangle } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface ProcessedCategory {
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

export function CategoryUploader() {
  const [uploadStatus, setUploadStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processedCategories, setProcessedCategories] = useState<ProcessedCategory[]>([]);
  const [hasDiscrepancies, setHasDiscrepancies] = useState(false);
  const { setCategories } = useFinanceStore();

  const validateParentTotals = (categories: ProcessedCategory[]): ProcessedCategory[] => {
    const categoryMap = new Map(categories.map(cat => [cat.code, cat]));
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

  const processCategories = (rows: any[]): ProcessedCategory[] => {
    const categories = rows.map(row => ({
      code: row.category_code,
      name: row.name,
      parentId: null,
      parent_code: row.parent_code || null,
      budgets: {
        "2023": parseFloat(row["2023"]) || 0,
        "2024": parseFloat(row["2024"]) || 0,
        "2025": parseFloat(row["2025"]) || 0
      },
      isLeaf: !row.name.toLowerCase().includes('summe')
    }));

    return validateParentTotals(categories);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet);

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
    
    setIsLoading(true);
    const categoryMap = new Map<string, any>();

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

        const savedCategory = await response.json();
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

            const updatedCategory = await response.json();
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="w-64"
          />
          <Button 
            variant="outline"
            onClick={handleSave}
            disabled={processedCategories.length === 0 || isLoading || hasDiscrepancies}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Categories
          </Button>
        </div>

        {uploadStatus && (
          <Alert variant={hasDiscrepancies ? "destructive" : "default"}>
            <AlertDescription>{uploadStatus}</AlertDescription>
          </Alert>
        )}

        {processedCategories.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Preview ({processedCategories.length} categories)</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Is Leaf</TableHead>
                    <TableHead className="text-right">2023</TableHead>
                    <TableHead className="text-right">2024</TableHead>
                    <TableHead className="text-right">2025</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedCategories.map((category) => (
                    <TableRow 
                      key={category.code}
                      className={category.validation?.hasDiscrepancy ? 'bg-red-50' : ''}
                    >
                      <TableCell>{category.code}</TableCell>
                      <TableCell>{category.name}</TableCell>
                      <TableCell>{category.parent_code || '-'}</TableCell>
                      <TableCell>{category.isLeaf ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-right">{formatNumber(category.budgets["2023"])}</TableCell>
                      <TableCell className="text-right">{formatNumber(category.budgets["2024"])}</TableCell>
                      <TableCell className="text-right">{formatNumber(category.budgets["2025"])}</TableCell>
                      <TableCell>
                        {category.validation?.hasDiscrepancy && (
                          <div className="flex items-center text-red-600">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Sum mismatch
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
