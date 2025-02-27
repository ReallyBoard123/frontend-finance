// components/common/data-table/data-table.tsx
import React, { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Transaction } from '@/types/transactions';

export interface Column<T> {
  key: string;
  header: string;
  cell: (item: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  onSort?: (key: keyof Transaction) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  rowClassName?: (item: T) => string;
  emptyMessage?: string;
  renderExpanded?: (item: T) => ReactNode;
  isRowExpanded?: (item: T) => boolean;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  onSort,
  sortKey,
  sortDirection,
  rowClassName,
  emptyMessage = "No data available",
  renderExpanded,
  isRowExpanded
}: DataTableProps<T>) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead 
                key={column.key} 
                className={column.sortable ? 'cursor-pointer' : ''}
                onClick={column.sortable ? () => onSort?.(column.key as keyof Transaction) : undefined}
              >
                <div className="flex items-center">
                  {column.header}
                  {column.sortable && sortKey === column.key && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-4">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <React.Fragment key={item.id}>
                <TableRow 
                  className={`${onRowClick ? 'cursor-pointer' : ''} ${rowClassName?.(item) || ''}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <TableCell key={`${item.id}-${column.key}`}>
                      {column.cell(item)}
                    </TableCell>
                  ))}
                </TableRow>
                {renderExpanded && isRowExpanded?.(item) && (
                  <TableRow className="bg-gray-50">
                    <TableCell colSpan={columns.length}>
                      {renderExpanded(item)}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}