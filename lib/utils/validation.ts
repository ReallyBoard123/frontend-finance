// lib/utils/validation.ts
import { z } from "zod";
import { Category } from "@/types/category";
import { Transaction } from "@/types/transaction";

/**
 * Zod schema for category validation
 */
export const categorySchema = z.object({
  code: z.string().regex(/^F\d{4}$/, "Must be in format F#### (e.g., F0861)"),
  name: z.string().min(1, "Name is required"),
  parentId: z.string().nullable(),
  budgets: z.record(z.string(), z.number().min(0, "Budget must be positive")).optional(),
  color: z.string().optional(),
  isSpecialCategory: z.boolean().optional(),
  categoryType: z.string().optional()
});

/**
 * Zod schema for partial category updates
 */
export const updateCategorySchema = z.object({
  code: z.string().regex(/^F\d{4}$/).optional(),
  name: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
  budgets: z.record(z.string(), z.number().min(0)).optional(),
  color: z.string().optional(),
  isSpecialCategory: z.boolean().optional(),
  categoryType: z.string().optional()
});

/**
 * Validates a transaction ID format
 */
export const isValidTransactionId = (id: string): boolean => {
  // Format: projectCode-year-documentNumber-internalCode
  const parts = id.split('-');
  return parts.length >= 3;
};

/**
 * Validates if a transaction has required fields filled
 */
export const validateTransaction = (transaction: Transaction): { 
  isValid: boolean; 
  missingFields: string[]; 
  fixableFields: string[] 
} => {
  const requiredFields = [
    'projectCode',
    'year',
    'amount',
    'internalCode',
    'description',
    'transactionType',
    'bookingDate'
  ];

  const fixableFields = ['costGroup'];

  const missingFields = requiredFields.filter(field => {
    const value = transaction[field as keyof Transaction];
    return value === undefined || value === null || value === '';
  });

  const missingFixableFields = fixableFields.filter(field => {
    const value = transaction[field as keyof Transaction];
    return value === undefined || value === null || value === '';
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
    fixableFields: missingFixableFields
  };
};

/**
 * Checks if a category code is a special numeric code (e.g., 600, 23152)
 */
export const isSpecialCategoryCode = (code: string): boolean => {
  return /^0*(600|23152)$/.test(code);
};

/**
 * Validates if a transaction has been properly mapped to a category
 */
export const isProperlyMapped = (transaction: Transaction, categories: Category[]): boolean => {
  // Check metadata for explicit flags
  const metadata = transaction.metadata as Record<string, any> || {};
  if (metadata.needsReview === true) {
    return false;
  }
  
  // If no categoryId, transaction needs mapping (unless it's a special numeric code)
  if (!transaction.categoryId) {
    // Handle special numeric codes that should be preserved
    if (isSpecialCategoryCode(transaction.internalCode)) {
      // These codes are valid on their own if status is completed
      if (transaction.status === 'completed') {
        return true;
      }
      return false;
    }
    
    // Other numeric codes without a category are unmapped
    return false;
  }
  
  // Check if there's a valid category code with F prefix
  if (!transaction.categoryCode || !transaction.categoryCode.startsWith('F')) {
    return false;
  }
  
  // Verify the category exists
  const category = categories.find(c => c.code === transaction.categoryCode);
  if (!category) {
    return false;
  }

  // Check if it's a parent category that needs child selection
  const isParent = categories.some(c => c.parentId === category.id);
  if (!isParent) {
    // It's a leaf category, properly mapped
    return true;
  }

  // If parent, check we've selected a child
  const childCategories = categories.filter(c => c.parentId === category.id);
  return childCategories.some(child => child.code === transaction.categoryCode);
};