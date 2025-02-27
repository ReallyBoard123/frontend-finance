// components/common/ui/action-button.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  label: string;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function ActionButton({
  onClick,
  loading = false,
  disabled = false,
  icon: Icon,
  label,
  variant = 'default',
  size = 'default',
  className
}: ActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      variant={variant}
      size={size}
      className={cn('gap-2', className)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : Icon ? (
        <Icon className="h-4 w-4" />
      ) : null}
      {label}
    </Button>
  );
}