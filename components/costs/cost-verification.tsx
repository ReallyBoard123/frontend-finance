import React from 'react';
import { Button } from "@/components/ui/button";
import { ProcessedData } from '@/types/transactions';
import { Category } from '@/types/budget';

interface CostVerificationProps {
  processedData: ProcessedData | null;
  categories: Category[];
  onVerificationComplete: (isValid: boolean, message: string) => void;
}

export function CostVerification({ 
  processedData, 
  categories,
  onVerificationComplete 
}: CostVerificationProps) {
  const calculateTotalBudget = (categoryId: string, year: string): number => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 0;

    const childCategories = categories.filter(c => c.parentId === categoryId);
    if (childCategories.length === 0) {
      return category.budgets[year] || 0;
    }

    return childCategories.reduce((sum, child) => 
      sum + (child.budgets[year] || 0), 0
    );
  };

  const handleVerify = () => {
    if (!processedData) return;

    const verificationResults = Object.entries(processedData.yearlyTotals)
      .flatMap(([year, yearlyCategories]) =>
        Object.entries(yearlyCategories)
          .map(([code, data]) => {
            const category = categories.find(c => c.code === code);
            if (!category) return null;

            const totalBudget = calculateTotalBudget(category.id, year);
            const isParent = categories.some(c => c.parentId === category.id);

            // Only verify leaf categories or parents with direct transactions
            if (isParent && data.transactions.length === 0) return null;

            return {
              year,
              code,
              isValid: data.spent <= totalBudget,
              spent: data.spent,
              budget: totalBudget
            };
          })
          .filter((result): result is NonNullable<typeof result> => result !== null)
      );

    const overBudgetItems = verificationResults
      .filter(r => !r.isValid)
      .map(r => `${r.code} (${r.year}): ${r.spent.toFixed(2)}/${r.budget.toFixed(2)}`);

    const allValid = overBudgetItems.length === 0;
    const message = allValid 
      ? 'Verification successful. Ready to save.'
      : `Warning: Budget exceeded in following categories:\n${overBudgetItems.join('\n')}`;

    onVerificationComplete(allValid, message);
  };

  return (
    <Button 
      onClick={handleVerify}
      disabled={!processedData}
      variant="outline"
    >
      Verify Data
    </Button>
  );
}