import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (dateString: string | Date) => {
  if (!dateString) return '';
  try {
    if (typeof dateString === 'string') {
      return new Date(dateString).toLocaleDateString('de-DE');
    }
    return dateString.toLocaleDateString('de-DE');
  } catch {
    console.error('Error formatting date:', dateString);
    return String(dateString);
  }
};