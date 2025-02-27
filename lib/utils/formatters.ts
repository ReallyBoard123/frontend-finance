// lib/utils/formatters.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind CSS classes with potential conditionals
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string or Date object to localized string (German format)
 */
export const formatDate = (dateString: string | Date): string => {
  if (!dateString) return '';
  try {
    if (typeof dateString === 'string') {
      return new Date(dateString).toLocaleDateString('de-DE');
    }
    return dateString.toLocaleDateString('de-DE');
  } catch (error) {
    console.error('Error formatting date:', dateString);
    return String(dateString);
  }
};

/**
 * Formats a number as currency (EUR)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(amount);
};

/**
 * Formats a number with German locale
 */
export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};