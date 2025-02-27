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

  return (
    <td 
      className={cn(
        "px-4 py-2 text-right",
        isInspectMode && "hover:bg-blue-50 cursor-pointer",
        className
      )}
      onClick={handleClick}
    >
      {amount.toLocaleString(locale)} {currencyCode}
    </td>
  );
}