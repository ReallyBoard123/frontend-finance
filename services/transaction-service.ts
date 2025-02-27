import { Transaction, TransactionUpdate, TransactionBase, ProcessedData } from '@/types/transaction';
import { FilterParams, SortParams } from '@/types/common';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'An error occurred');
  }
  
  const data = await response.json();
  return data.data as T;
}

function buildQueryString(filters?: FilterParams, sort?: SortParams): string {
  const params = new URLSearchParams();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  if (sort) {
    params.append('sortBy', sort.field);
    params.append('sortDir', sort.direction);
  }
  
  return params.toString() ? `?${params.toString()}` : '';
}

export const transactionService = {
  async getAll(filters?: FilterParams, sort?: SortParams): Promise<Transaction[]> {
    const queryString = buildQueryString(filters, sort);
    const response = await fetch(`/api/transactions${queryString}`);
    const result = await handleResponse<{data: Transaction[], count: number}>(response);
    return result.data;
  },
  
  async getById(id: string): Promise<Transaction> {
    const response = await fetch(`/api/transactions/${id}`);
    return handleResponse<Transaction>(response);
  },
  
  async create(data: TransactionBase): Promise<Transaction> {
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    return handleResponse<Transaction>(response);
  },
  
  async batchCreate(data: TransactionBase[]): Promise<Transaction[]> {
    const response = await fetch('/api/transactions/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    return handleResponse<Transaction[]>(response);
  },
  
  async update(id: string, data: TransactionUpdate): Promise<Transaction> {
    const response = await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    return handleResponse<Transaction>(response);
  },
  
  async checkExists(id: string): Promise<{found: boolean, details: any}> {
    const response = await fetch(`/api/transactions/check/${id}`);
    return handleResponse<{found: boolean, details: any}>(response);
  },
  
  async saveProcessedData(data: ProcessedData): Promise<{success: boolean, message: string}> {
    const transactions = [...data.transactions, ...data.specialTransactions];
    
    // Process in batches to avoid overwhelming the server
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < transactions.length; i += batchSize) {
      batches.push(transactions.slice(i, i + batchSize));
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const batch of batches) {
      try {
        // First check which transactions already exist
        const existenceChecks = await Promise.all(
          batch.map(t => this.checkExists(t.id))
        );
        
        // Filter out existing transactions
        const newTransactions = batch.filter((t, index) => !existenceChecks[index].found);
        
        if (newTransactions.length > 0) {
          const results = await this.batchCreate(newTransactions);
          successCount += results.length;
        }
        
        errorCount += batch.length - newTransactions.length;
      } catch (error) {
        errorCount += batch.length;
        console.error('Error saving batch:', error);
      }
    }
    
    return {
      success: errorCount === 0,
      message: `Processed: ${successCount} saved, ${errorCount} skipped/failed`
    };
  }
};