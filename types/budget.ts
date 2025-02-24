// types/budget.ts
export interface Category {
  id: string
  code: string
  name: string
  parentId: string | null
  budgets: {
    [key: string]: number
  }
  color?: string
  children?: Category[]
}

export interface CategoryFormData {
  code: string
  name: string
  parentId: string | null
  budgets?: {
    [key: string]: number
  }
  color?: string
}