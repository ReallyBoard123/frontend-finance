'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CategoryManager } from '@/components/budget/category-manager';
import { InquiryList } from '@/components/budget/inquiry-list';
import { useFinanceStore } from '@/lib/store';
import { useCategoryOperations } from '@/lib/hooks/useCategoryOperations';
import { toast } from 'sonner';

export default function CategoriesPage() {
  const { categories } = useFinanceStore();
  const { fetchCategories } = useCategoryOperations();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showInquiries, setShowInquiries] = useState(false);
  const initialFetchDone = useRef(false);
  
  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      // Skip if we already have data or if already fetched once
      if (categories.length > 0 || initialFetchDone.current) return;
      
      initialFetchDone.current = true;
      setIsLoading(true);
      
      try {
        await fetchCategories();
      } catch (error) {
        console.error('Error loading categories:', error);
        toast.error('Failed to load categories');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [fetchCategories]);
  
  const handleRefresh = async () => {
    if (isLoading) return; // Prevent multiple simultaneous refreshes
    
    setIsLoading(true);
    try {
      await fetchCategories();
      toast.success('Categories refreshed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh categories');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout 
      title="Budget Categories" 
      onRefresh={handleRefresh}
      isRefreshing={isLoading}
    >
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Category Management</h2>
            <div className="flex space-x-2">
              <button
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  !showInquiries ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setShowInquiries(false)}
              >
                Categories
              </button>
              <button
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  showInquiries ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setShowInquiries(true)}
              >
                Inquiries
              </button>
            </div>
          </div>
          
          {!showInquiries ? (
            <CategoryManager />
          ) : (
            <InquiryList />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}