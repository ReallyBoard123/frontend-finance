// types/budget.ts
export interface Category {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  budgets: Record<string, number>;
  color?: string;
  isSpecialCategory?: boolean;
  categoryType?: 'ALLOCATION' | 'PAYMENT' | 'OTHER';
}

export interface CategoryFormData {
  code: string;
  name: string;
  parentId: string | null;
  isSpecialCategory?: boolean;
  categoryType?: string;
  budgets?: Record<string, number>;
  color?: string;
}

export interface CategoryTreeItem extends Category {
  children?: CategoryTreeItem[];
  level: number;
}