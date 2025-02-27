export type SpecialCategoryType = 'ALLOCATION' | 'PAYMENT' | 'OTHER';

export interface SpecialCategoryBase {
  code: string;
  name: string;
  description?: string;
  type: SpecialCategoryType;
  excludeFromTotals?: boolean;
  metadata?: Record<string, any>;
}

export interface SpecialCategory extends SpecialCategoryBase {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface SpecialCategoryFormData extends SpecialCategoryBase {}

export interface SpecialCategorySummary {
  id: string;
  code: string;
  name: string;
  type: SpecialCategoryType;
  allocated: Record<string, number>;
  received: Record<string, number>;
  count: Record<string, number>;
}