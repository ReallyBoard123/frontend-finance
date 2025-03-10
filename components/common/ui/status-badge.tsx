// components/common/ui/status-badge.tsx
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Check, X, HelpCircle, AlertCircle, Star } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { TransactionStatus } from '@/types/transactions';

interface StatusBadgeProps {
  status: TransactionStatus;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  processed: { 
    label: 'Processed', 
    className: 'bg-green-100 text-green-800',
    icon: <Check className="h-3.5 w-3.5 mr-1" />
  },
  completed: { 
    label: 'Completed', 
    className: 'bg-green-100 text-green-800',
    icon: <Check className="h-3.5 w-3.5 mr-1" />
  },
  unprocessed: { 
    label: 'Unprocessed', 
    className: 'bg-gray-100 text-gray-800',
    icon: <X className="h-3.5 w-3.5 mr-1" />
  },
  pending: { 
    label: 'Pending', 
    className: 'bg-yellow-100 text-yellow-800',
    icon: <HelpCircle className="h-3.5 w-3.5 mr-1" />
  },
  pending_inquiry: { 
    label: 'Inquiry Sent', 
    className: 'bg-amber-100 text-amber-800',
    icon: <HelpCircle className="h-3.5 w-3.5 mr-1" />
  },
  missing: { 
    label: 'Missing', 
    className: 'bg-red-100 text-red-800',
    icon: <AlertCircle className="h-3.5 w-3.5 mr-1" />
  },
  special: { 
    label: 'Special', 
    className: 'bg-purple-100 text-purple-800',
    icon: <Star className="h-3.5 w-3.5 mr-1" />
  },
  changed: { 
    label: 'Changed', 
    className: 'bg-blue-100 text-blue-800',
    icon: <Check className="h-3.5 w-3.5 mr-1" />
  }
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.unprocessed;
  
  return (
    <Badge 
      variant="secondary" 
      className={cn(config.className, className, "flex items-center")}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}