interface CostCellProps {
  amount: number;
  onCellClick?: (e: React.MouseEvent<HTMLElement>, amount: number, year: number, categoryCode: string) => void;
  isInspectMode?: boolean;
  year: number;
  categoryCode: string;
}

export function CostCell({ amount, onCellClick, isInspectMode, year, categoryCode }: CostCellProps) {
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (isInspectMode && onCellClick) {
      onCellClick(e, amount, year, categoryCode);
    }
  };

  return (
    <td 
      className={`px-4 py-2 text-right ${isInspectMode ? 'hover:bg-blue-50 cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      {amount.toLocaleString('de-DE')} €
    </td>
  );
}