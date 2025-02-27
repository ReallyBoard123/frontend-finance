// components/common/ui/expandable-row.tsx
import React, { ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ExpandableRowProps {
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  level?: number;
  className?: string;
}

export function ExpandableRow({
  isExpanded,
  onToggle,
  children,
  level = 0,
  className = ''
}: ExpandableRowProps) {
  return (
    <div 
      className={`flex items-center ${className}`} 
      style={{ paddingLeft: `${level * 20}px` }}
    >
      <Button
        variant="ghost"
        size="sm"
        className="p-0 h-6 w-6 mr-2 flex-shrink-0"
        onClick={onToggle}
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </Button>
      {children}
    </div>
  );
}