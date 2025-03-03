// lib/specialCategoryUtils.ts
import type { Transaction } from '@/types/transactions';

/**
 * Special category constants
 */
export const SPECIAL_CATEGORIES = {
  ELVI_FESTLEGUNGEN: '600', // Transactions under process
  ZUWEISUNG_LAUFENDE_ZWECKE: '23152' // Special allocations
};

/**
 * Checks if a transaction has a special internal code
 */
export function hasSpecialInternalCode(transaction: Transaction): boolean {
  if (!transaction.internalCode) return false;
  
  const normalizedCode = transaction.internalCode.replace(/^0+/, ''); // Remove leading zeros
  return Object.values(SPECIAL_CATEGORIES).includes(normalizedCode);
}

/**
 * Checks if a transaction is an ELVI transaction (code 600)
 */
export function isElviTransaction(transaction: Transaction): boolean {
  if (!transaction.internalCode) return false;
  
  const normalizedCode = transaction.internalCode.replace(/^0+/, ''); // Remove leading zeros
  return normalizedCode === SPECIAL_CATEGORIES.ELVI_FESTLEGUNGEN;
}

/**
 * Checks if a transaction is a Zuweisung transaction (code 23152)
 */
export function isZuweisungTransaction(transaction: Transaction): boolean {
  if (!transaction.internalCode) return false;
  
  const normalizedCode = transaction.internalCode.replace(/^0+/, ''); // Remove leading zeros
  return normalizedCode === SPECIAL_CATEGORIES.ZUWEISUNG_LAUFENDE_ZWECKE;
}

/**
 * Generate a stable fingerprint for transaction matching across exports
 */
export function generateTransactionFingerprint(transaction: Transaction): string {
  // Round amount to 2 decimal places to handle floating point issues
  const amount = typeof transaction.amount === 'number' 
    ? parseFloat(transaction.amount.toFixed(2))
    : parseFloat(String(transaction.amount)).toFixed(2);
  
  // Combine stable properties to create a unique fingerprint
  return `${transaction.projectCode}_${transaction.internalCode}_${amount}_${transaction.personReference || ''}`;
}

/**
 * Determines if a transaction should appear in missing entries
 */
export function shouldAppearInMissingEntries(transaction: Transaction): boolean {
  // ELVI transactions (600) should always appear in missing entries unless they're completed
  if (isElviTransaction(transaction) && transaction.status !== 'completed') {
    return true;
  }
  
  // For other transactions, check if they're missing a proper category mapping
  if (!transaction.categoryId && !isZuweisungTransaction(transaction)) {
    return true;
  }
  
  return false;
}