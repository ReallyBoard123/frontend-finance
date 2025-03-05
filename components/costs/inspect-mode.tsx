// components/costs/inspect-mode.tsx
import React, { useState, ReactElement } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransactionDetails } from './tabbed-transaction';
import type { Transaction } from '@/types/transactions';

interface InspectModeProps {
  children: React.ReactNode;
  transactions: Transaction[];
  title?: string;
}

// Define an interface for components that can accept inspect props
interface ComponentWithInspectProps {
  onCellClick?: (e: React.MouseEvent<HTMLElement>, amount: number, year: number | string, categoryCode: string) => void;
  isInspectMode?: boolean;
}

// Helper to check if a component accepts inspect properties
const isValidComponentWithProps = (child: ReactElement): child is React.ReactElement<ComponentWithInspectProps> => {
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
  const [selectedData, setSelectedData] = useState<{
    amount: number;
    year: number | string;
    categoryCode: string;
  } | null>(null);

  const handleCellClick = (e: React.MouseEvent<HTMLElement>, amount: number, year: number | string, categoryCode: string) => {
    if (!isInspectMode) return;
    e.preventDefault();
    setSelectedData({ amount, year, categoryCode });
  };

  const matchingTransactions = selectedData ? 
    transactions.filter(t => 
      t.year.toString() === selectedData.year.toString() && 
      t.categoryCode === selectedData.categoryCode
    ) : [];

  // Clone children with inspect props
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      // Only add props if it's a custom component that accepts our props
      if (isValidComponentWithProps(child)) {
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
      
      <Dialog open={!!selectedData} onOpenChange={() => setSelectedData(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Transaction Details for {selectedData?.categoryCode} ({selectedData?.year})
            </DialogTitle>
          </DialogHeader>
          {selectedData && matchingTransactions.length > 0 && (
            <TransactionDetails 
              transactions={matchingTransactions}
              categoryCode={selectedData.categoryCode}
              year={Number(selectedData.year)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}