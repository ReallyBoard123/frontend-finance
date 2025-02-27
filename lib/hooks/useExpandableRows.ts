import { useState } from 'react';

export function useExpandableRows<T extends { id: string }>(initialExpanded: string[] = []) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(initialExpanded));

  const toggleExpand = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  const expandAll = (rows: T[]) => {
    setExpandedRows(new Set(rows.map(row => row.id)));
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  const isExpanded = (rowId: string) => expandedRows.has(rowId);

  return {
    expandedRows,
    toggleExpand,
    expandAll,
    collapseAll,
    isExpanded
  };
}