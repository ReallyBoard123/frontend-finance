// components/common/dialogs/form-dialog.tsx
import React, { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

interface FormDialogProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitDisabled?: boolean;
}

export function FormDialog({
  title,
  isOpen,
  onClose,
  onSubmit,
  children,
  isSubmitting = false,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  isSubmitDisabled = false
}: FormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {children}
        </div>
        
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || isSubmitDisabled}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}