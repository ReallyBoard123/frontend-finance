// components/common/ui/file-uploader.tsx
import React, { ChangeEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label?: string;
  className?: string;
}

export function FileUploader({
  onFileSelect,
  accept = ".xlsx,.xls,.csv",
  label = "Upload File",
  className
}: FileUploaderProps) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className={className}>
      <Label className="flex items-center gap-2">
        <Upload className="h-4 w-4" />
        {label}
      </Label>
      <Input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="mt-1"
      />
    </div>
  );
}