// components/costs/inspect-mode.tsx
import React, { useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransactionDetails } from './tabbed-transaction';
import type { Transaction } from '@/types/transactions';

interface InspectModeProps {
  children: React.ReactNode;
  transactions: Transaction[];
  title?: string;
}

// Define an interface for components that can accept our props
interface ComponentWithInspectProps {
  onCellClick?: (e: React.MouseEvent<HTMLElement>, amount: number, year: number, categoryCode: string) => void;
  isInspectMode?: boolean;
}

// Helper function to check if a component accepts certain props
const isValidComponentWithProps = (child: React.ReactElement): child is React.ReactElement<ComponentWithInspectProps> => {
  const { type } = child;
  // If it's a custom component (not a DOM element), it should accept our props
  return typeof type !== 'string';
};

export function InspectMode({ 
  children, 
  transactions,
  title = "Inspect Mode" 
}: InspectModeProps) {
  const [isInspectMode, setIsInspectMode] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<{
    amount: number;
    year: number;
    categoryCode: string;
  } | null>(null);

  const handleCellClick = (e: React.MouseEvent<HTMLElement>, amount: number, year: number, categoryCode: string) => {
    if (!isInspectMode) return;
    e.preventDefault();
    setSelectedAmount({ amount, year, categoryCode });
  };

  const matchingTransactions = selectedAmount ? 
    transactions.filter(t => 
      t.year === selectedAmount.year && 
      t.categoryCode === selectedAmount.categoryCode
    ) : [];

  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      // Only add props if it's a custom component, not a DOM element
      if (isValidComponentWithProps(child)) {
        // Type assertion to tell TypeScript these props are valid
        return React.cloneElement(child, {
          onCellClick: handleCellClick,
          isInspectMode,
        } as Partial<ComponentWithInspectProps>);
      }
      return child;
    }
    return child;
  });

  return (
    <div>
      <div className="flex items-center space-x-2 mb-4">
        <Checkbox 
          id="inspect-mode" 
          checked={isInspectMode} 
          onCheckedChange={(checked) => setIsInspectMode(checked as boolean)}
        />
        <label htmlFor="inspect-mode" className="text-sm font-medium">
          {title}
        </label>
      </div>

      <div className={isInspectMode ? 'cursor-pointer' : ''}>
        {childrenWithProps}
      </div>
      
      <Dialog open={!!selectedAmount} onOpenChange={() => setSelectedAmount(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Transaction Details for {selectedAmount?.categoryCode} ({selectedAmount?.year})
            </DialogTitle>
          </DialogHeader>
          {selectedAmount && matchingTransactions.length > 0 && (
            <TransactionDetails 
              transactions={matchingTransactions}
              categoryCode={selectedAmount.categoryCode}
              year={selectedAmount.year}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}