import { Inquiry, InquiryFormData, InquiryUpdate } from '@/types/inquiry';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'An error occurred');
  }
  
  const data = await response.json();
  return data.data as T;
}

export const inquiryService = {
  async getAll(status?: string): Promise<Inquiry[]> {
    const queryString = status ? `?status=${status}` : '';
    const response = await fetch(`/api/inquiries${queryString}`);
    return handleResponse<Inquiry[]>(response);
  },
  
  async getById(id: string): Promise<Inquiry> {
    const response = await fetch(`/api/inquiries/${id}`);
    return handleResponse<Inquiry>(response);
  },
  
  async create(data: InquiryFormData): Promise<Inquiry> {
    const response = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    return handleResponse<Inquiry>(response);
  },
  
  async update(id: string, data: InquiryUpdate): Promise<Inquiry> {
    const response = await fetch(`/api/inquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    return handleResponse<Inquiry>(response);
  }
};