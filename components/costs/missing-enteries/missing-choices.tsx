import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, CreditCard, FolderTree } from 'lucide-react';
import { cn } from "@/lib/utils";

export type MissingActionType = 'assign' | 'ask' | 'paid';

interface MissingChoicesProps {
  onActionSelect: (action: MissingActionType) => void;
  disabled?: boolean;
  className?: string;
  defaultValue?: MissingActionType;
}

export function MissingChoices({
  onActionSelect,
  disabled = false,
  className,
  defaultValue
}: MissingChoicesProps) {
  return (
    <Select
      onValueChange={onActionSelect as (value: string) => void}
      disabled={disabled}
      defaultValue={defaultValue}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={disabled ? "Inquiry Pending" : "Select action"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="assign">
          <div className="flex items-center">
            <FolderTree className="w-4 h-4 mr-2" />
            Assign Category
          </div>
        </SelectItem>
        <SelectItem value="ask">
          <div className="flex items-center">
            <HelpCircle className="w-4 h-4 mr-2" />
            Ask Gerlind
          </div>
        </SelectItem>
        <SelectItem value="paid">
          <div className="flex items-center">
            <CreditCard className="w-4 h-4 mr-2" />
            Already Paid
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}