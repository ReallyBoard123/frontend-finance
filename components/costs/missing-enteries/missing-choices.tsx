// components/budget/missing-choices.tsx
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, CreditCard, FolderTree } from 'lucide-react';

interface MissingChoicesProps {
  onActionSelect: (action: string) => void;
  disabled?: boolean;
}

export function MissingChoices({ onActionSelect, disabled = false }: MissingChoicesProps) {
  return (
    <Select onValueChange={onActionSelect} disabled={disabled}>
      <SelectTrigger className="w-full">
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