// components/costs/update-summary.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Info, AlertCircle, X } from 'lucide-react';

interface UpdateSummaryProps {
  summary: {
    newCount: number;
    updatedCount: number;
    unchangedCount: number;
    errorCount: number;
    details?: {
      new: string[];
      updated: string[];
      unchanged: string[];
      errors: string[];
    }
  };
  onClose: () => void;
}

export function UpdateSummary({ summary, onClose }: UpdateSummaryProps) {
  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Transaction Import Summary</DialogTitle>
          <DialogDescription>
            Processed {summary.newCount + summary.updatedCount + summary.unchangedCount + summary.errorCount} transactions
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-green-50 p-3 rounded border border-green-200 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium">New</div>
              <div className="text-2xl">{summary.newCount}</div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded border border-blue-200 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <div>
              <div className="font-medium">Updated</div>
              <div className="text-2xl">{summary.updatedCount}</div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded border border-gray-200 flex items-center gap-2">
            <X className="h-5 w-5 text-gray-600" />
            <div>
              <div className="font-medium">Unchanged</div>
              <div className="text-2xl">{summary.unchangedCount}</div>
            </div>
          </div>
          
          <div className="bg-red-50 p-3 rounded border border-red-200 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <div className="font-medium">Errors</div>
              <div className="text-2xl">{summary.errorCount}</div>
            </div>
          </div>
        </div>
        
        {summary.details && (
          <ScrollArea className="h-[300px] pr-4">
            {summary.details.new.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-green-700 mb-2">New Transactions</h4>
                <ul className="text-sm space-y-1 pl-5 list-disc">
                  {summary.details.new.slice(0, 15).map((item, index) => (
                    <li key={`new-${index}`}>{item}</li>
                  ))}
                  {summary.details.new.length > 15 && (
                    <li className="font-medium">...and {summary.details.new.length - 15} more</li>
                  )}
                </ul>
              </div>
            )}
            
            {summary.details.updated.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-blue-700 mb-2">Updated Transactions</h4>
                <ul className="text-sm space-y-1 pl-5 list-disc">
                  {summary.details.updated.slice(0, 15).map((item, index) => (
                    <li key={`updated-${index}`}>{item}</li>
                  ))}
                  {summary.details.updated.length > 15 && (
                    <li className="font-medium">...and {summary.details.updated.length - 15} more</li>
                  )}
                </ul>
              </div>
            )}
            
            {summary.details.errors.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-red-700 mb-2">Errors</h4>
                <ul className="text-sm space-y-1 pl-5 list-disc">
                  {summary.details.errors.map((item, index) => (
                    <li key={`error-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </ScrollArea>
        )}
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}