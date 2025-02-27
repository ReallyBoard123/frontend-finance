import { Category, CategoryFormData } from '@/types/category';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'An error occurred');
  }
  
  const data = await response.json();
  return data.data as T;
}

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const response = await fetch('/api/categories');
    return handleResponse<Category[]>(response);
  },
  
  async getById(id: string): Promise<Category> {
    const response = await fetch(`/api/categories/${id}`);
    return handleResponse<Category>(response);
  },
  
  async create(data: CategoryFormData): Promise<Category> {
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    return handleResponse<Category>(response);
  },
  
  async update(id: string, data: Partial<CategoryFormData>): Promise<Category> {
    const response = await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    return handleResponse<Category>(response);
  },
  
  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
    });
    
    return handleResponse<void>(response);
  }
};