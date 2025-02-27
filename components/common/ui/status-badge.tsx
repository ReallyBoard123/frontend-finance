// components/common/ui/status-badge.tsx
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = 'pending' | 'completed' | 'unprocessed' | 'pending_inquiry' | 'resolved' | 'rejected';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pending: { 
    label: 'Pending', 
    className: 'bg-blue-100 text-blue-800' 
  },
  completed: { 
    label: 'Completed', 
    className: 'bg-green-100 text-green-800' 
  },
  unprocessed: { 
    label: 'Unprocessed', 
    className: 'bg-gray-100 text-gray-800' 
  },
  pending_inquiry: { 
    label: 'Inquiry Sent', 
    className: 'bg-amber-100 text-amber-800' 
  },
  resolved: { 
    label: 'Resolved', 
    className: 'bg-green-100 text-green-800' 
  },
  rejected: { 
    label: 'Rejected', 
    className: 'bg-red-100 text-red-800' 
  }
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.unprocessed;
  
  return (
    <Badge 
      variant="secondary" 
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}