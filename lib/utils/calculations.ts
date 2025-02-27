// lib/utils/calculations.ts
import { Transaction, YearlyTotals } from "@/types/transaction";
import { isSpecialCategoryCode } from "./validation";
import { Category } from "@/types/category";


/**
 * Calculates the yearly totals for categories based on transactions
 */
export function calculateYearlyTotals(transactions: Transaction[], categories: Category[]): YearlyTotals {
  const yearlyTotals: YearlyTotals = {};
  const years = [...new Set(transactions.map(t => t.year.toString()))];
  
  years.forEach(year => {
    yearlyTotals[year] = {};
    // Include regular categories
    categories.forEach(category => {
      yearlyTotals[year][category.code] = {
        spent: 0,
        budget: category.budgets?.[year] || 0,
        remaining: category.budgets?.[year] || 0,
        count: 0,
        transactions: []
      };
    });
    
    // Add special tracking for numeric codes
    ['600', '23152'].forEach(specialCode => {
      yearlyTotals[year][specialCode] = {
        spent: 0,
        budget: 0,
        remaining: 0, 
        count: 0,
        transactions: []
      };
    });
  });

  transactions.forEach(transaction => {
    const year = transaction.year.toString();
    
    // Handle special numeric codes or dedicated special categories
    if (isSpecialCategoryCode(transaction.internalCode) || transaction.specialCategoryCode) {
      const code = transaction.specialCategoryCode || 
                   transaction.internalCode.replace(/^0+/, '');
      
      if (yearlyTotals[year][code]) {
        yearlyTotals[year][code].spent += transaction.amount;
        yearlyTotals[year][code].count += 1;
        yearlyTotals[year][code].transactions.push(transaction.id);
      }
      return;
    }
    
    // Regular category processing
    const categoryCode = transaction.categoryCode;
    if (!categoryCode || !yearlyTotals[year][categoryCode]) return;
    
    yearlyTotals[year][categoryCode].spent += transaction.amount;
    yearlyTotals[year][categoryCode].remaining = 
      yearlyTotals[year][categoryCode].budget - yearlyTotals[year][categoryCode].spent;
    yearlyTotals[year][categoryCode].count += 1;
    yearlyTotals[year][categoryCode].transactions.push(transaction.id);

    // Update parent category totals if exists
    const category = categories.find(c => c.code === categoryCode);
    if (!category) return;

    const parentCategory = categories.find(c => c.id === category.parentId);
    if (parentCategory && yearlyTotals[year][parentCategory.code]) {
      yearlyTotals[year][parentCategory.code].spent += transaction.amount;
      yearlyTotals[year][parentCategory.code].remaining = 
        yearlyTotals[year][parentCategory.code].budget - yearlyTotals[year][parentCategory.code].spent;
      // Don't increment count for parent categories to avoid double counting
      // But we could track the transaction ID for reference
      if (!yearlyTotals[year][parentCategory.code].transactions.includes(transaction.id)) {
        yearlyTotals[year][parentCategory.code].transactions.push(transaction.id);
      }
    }
  });

  return yearlyTotals;
}

/**
 * Calculates the total budget for a category (including children)
 */
export function calculateTotalBudget(categoryId: string, year: string, categories: Category[]): number {
  const category = categories.find(c => c.id === categoryId);
  if (!category) return 0;
  
  // Skip special categories in budget calculations
  if (category.isSpecialCategory) return 0;

  const childCategories = categories.filter(c => c.parentId === categoryId);
  if (childCategories.length === 0) {
    return (category.budgets?.[year] || 0);
  }

  return childCategories.reduce((sum, child) => 
    sum + ((child.budgets?.[year] || 0)), 0
  );
}

/**
 * Calculates the total spent for a category (including children)
 */
export function calculateTotalSpent(
  categoryId: string, 
  year: string, 
  categories: Category[], 
  yearlyTotals: YearlyTotals
): number {
  const totals = yearlyTotals[year];
  if (!totals) return 0;

  const category = categories.find(c => c.id === categoryId);
  if (!category) return 0;

  const childCategories = categories.filter(c => c.parentId === categoryId);
  if (childCategories.length === 0) {
    return totals[category.code]?.spent || 0;
  }

  return childCategories.reduce((sum, child) => 
    sum + (totals[child.code]?.spent || 0), 0
  );
}

/**
 * Generates a transaction ID from transaction data
 */
export function generateTransactionId(transaction: Transaction): string {
  const docNumber = transaction.documentNumber || `NO_DOC_${Date.now()}`;
  return `${transaction.projectCode}-${transaction.year}-${docNumber}`;
}

/**
 * Prepares transaction data for API submission
 */
export function prepareTransactionData(transaction: Transaction): Partial<Transaction> {
  // For special numeric codes, preserve them without forcing a category
  const isSpecialCode = isSpecialCategoryCode(transaction.internalCode);
  
  // Handle special categories
  let categoryId = transaction.categoryId;
  let specialCategoryId = transaction.specialCategoryId;
  let categoryCode = transaction.categoryCode;
  let specialCategoryCode = transaction.specialCategoryCode;
  
  // If it's a special code but no special category is assigned yet
  if (isSpecialCode && !specialCategoryId) {
    specialCategoryId = null;
    specialCategoryCode = transaction.internalCode;
    categoryId = null;
    categoryCode = undefined;
  }
  
  return {
    ...transaction,
    id: generateTransactionId(transaction),
    internalCode: transaction.internalCode.toString().padStart(4, '0'),
    bookingDate: new Date(transaction.bookingDate).toISOString(),
    invoiceDate: transaction.invoiceDate ? new Date(transaction.invoiceDate).toISOString() : null,
    year: Number(transaction.year),
    amount: Number(transaction.amount),
    status: transaction.status || 'unprocessed',
    costGroup: transaction.costGroup || 'Unspecified',
    projectCode: transaction.projectCode.toString(),
    documentNumber: transaction.documentNumber?.toString() || undefined,
    personReference: transaction.personReference || undefined,
    details: transaction.details || undefined,
    invoiceNumber: transaction.invoiceNumber || undefined,
    paymentPartner: transaction.paymentPartner || undefined,
    internalAccount: transaction.internalAccount || undefined,
    accountLabel: transaction.accountLabel || undefined,
    categoryId,
    specialCategoryId,
    categoryCode,
    specialCategoryCode,
    metadata: {
      needsReview: isSpecialCode && !specialCategoryId,
      originalInternalCode: transaction.internalCode
    }
  };
}