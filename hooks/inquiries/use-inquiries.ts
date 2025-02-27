import { useCallback, useEffect } from 'react';
import { useFinanceStore } from '@/lib/store';
import { Inquiry, InquiryFormData, InquiryUpdate } from '@/types/inquiry';
import { useErrorHandler } from '../ui/use-error-handler';
import { inquiryService } from '@/services/inquiry-service';

export function useInquiries() {
  const { 
    inquiries, 
    isLoading, 
    error, 
    fetchInquiries, 
    setInquiries, 
    setError 
  } = useFinanceStore(state => ({
    inquiries: state.inquiries,
    isLoading: state.isLoading.inquiries,
    error: state.error.inquiries,
    fetchInquiries: state.fetchInquiries,
    setInquiries: state.setInquiries,
    setError: state.setError
  }));
  
  const { handleError } = useErrorHandler();
  
  const refreshInquiries = useCallback(async () => {
    try {
      await fetchInquiries();
    } catch (error) {
      handleError(error, 'Failed to fetch inquiries');
    }
  }, [fetchInquiries, handleError]);
  
  const createInquiry = useCallback(async (data: InquiryFormData): Promise<Inquiry | null> => {
    try {
      const result = await inquiryService.create(data);
      await refreshInquiries(); // Refresh after creation
      return result;
    } catch (error) {
      handleError(error, 'Failed to create inquiry');
      return null;
    }
  }, [refreshInquiries, handleError]);
  
  const updateInquiry = useCallback(async (id: string, data: InquiryUpdate): Promise<Inquiry | null> => {
    try {
      const result = await inquiryService.update(id, data);
      await refreshInquiries(); // Refresh after update
      return result;
    } catch (error) {
      handleError(error, 'Failed to update inquiry');
      return null;
    }
  }, [refreshInquiries, handleError]);
  
  // Get pending inquiries
  const pendingInquiries = inquiries.filter(i => i.status === 'pending');
  
  // Get resolved inquiries
  const resolvedInquiries = inquiries.filter(i => i.status === 'resolved');
  
  // Get rejected inquiries
  const rejectedInquiries = inquiries.filter(i => i.status === 'rejected');
  
  // Auto-fetch inquiries on mount if empty
  useEffect(() => {
    if (inquiries.length === 0 && !isLoading && !error) {
      refreshInquiries();
    }
  }, [inquiries.length, isLoading, error, refreshInquiries]);
  
  // Clear error on unmount
  useEffect(() => {
    return () => {
      setError('inquiries', undefined);
    };
  }, [setError]);
  
  return {
    inquiries,
    pendingInquiries,
    resolvedInquiries,
    rejectedInquiries,
    isLoading,
    error,
    refreshInquiries,
    createInquiry,
    updateInquiry
  };
}