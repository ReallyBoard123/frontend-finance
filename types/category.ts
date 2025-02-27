export interface CategoryBase {
    code: string;
    name: string;
    parentId: string | null;
    isLeaf?: boolean;
    color?: string;
    metadata?: Record<string, any>;
  }
  
  export interface CategoryBudget {
    id: string;
    categoryId: string;
    year: number;
    amount: number;
    spent: number;
    remaining: number;
    createdAt: string | Date;
    updatedAt: string | Date;
  }
  
  export interface CategoryFormData extends CategoryBase {
    budgets?: Record<string, number>;
  }
  
  export interface CategoryWithBudget extends Category {
    budget: number;
    spent: number;
    remaining: number;
  }
  
  export interface CategoryTree {
    category: Category;
    children: CategoryTree[];
    level: number;
  }

  export interface Category {
    id: string;
    code: string;
    name: string;
    parentId?: string;
    budgets?: Record<string, number>;
    isSpecialCategory?: boolean;
  }