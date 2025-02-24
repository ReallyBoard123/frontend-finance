// components/budget/missing-choices.tsx
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, CreditCard, FolderTree } from 'lucide-react';

interface MissingChoicesProps {
  onActionSelect: (action: string) => void;
}

export function MissingChoices({ onActionSelect }: MissingChoicesProps) {
  return (
    <Select onValueChange={onActionSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select action" />
      </SelectTrigger>
      <SelectContent>
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
        <SelectItem value="assign">
          <div className="flex items-center">
            <FolderTree className="w-4 h-4 mr-2" />
            Assign Child
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}