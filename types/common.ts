export type Status = 'pending' | 'completed' | 'unprocessed' | 'pending_inquiry' | 'rejected' | 'resolved';

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  pagination?: Pagination;
}

export interface FilterParams {
  search?: string;
  year?: number | string;
  status?: Status;
  categoryCode?: string;
  [key: string]: any;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}