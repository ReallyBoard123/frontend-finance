// components/costs/cost-cell.tsx
import React from 'react';
import { cn } from "@/lib/utils";

export interface CostCellProps {
  amount: number;
  onCellClick?: (e: React.MouseEvent<HTMLElement>, amount: number, year: number, categoryCode: string) => void;
  isInspectMode?: boolean;
  year: number;
  categoryCode: string;
  className?: string;
  currencyCode?: string;
  locale?: string;
}

export function CostCell({ 
  amount, 
  onCellClick, 
  isInspectMode = false, 
  year, 
  categoryCode,
  className,
  currencyCode = '€',
  locale = 'de-DE'
}: CostCellProps) {
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (isInspectMode && onCellClick) {
      onCellClick(e, amount, year, categoryCode);
    }
  };

  // Using a wrapper div inside the td to handle the click event
  // This avoids passing non-standard props to DOM elements
  return (
    <td className={cn("px-4 py-2 text-right", className)}>
      <div 
        className={isInspectMode ? "hover:bg-blue-50 cursor-pointer" : ""}
        onClick={handleClick}
        role={isInspectMode ? "button" : undefined}
        tabIndex={isInspectMode ? 0 : undefined}
      >
        {amount.toLocaleString(locale)} {currencyCode}
      </div>
    </td>
  );
}