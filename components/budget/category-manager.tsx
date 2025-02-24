'use client'

import { useState, useEffect } from 'react'
import { useFinanceStore } from '@/lib/store'
import { CategoryForm } from './category-form'
import { EnhancedCategoryTree } from './enhanced-category-tree'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { CategoryFormData, Category } from '@/types/budget'
import { CategoryUploader } from './category-uploader'

export function CategoryManager() {
  const [open, setOpen] = useState(false)
  const { categories, setCategories, costs } = useFinanceStore()

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then((data: Category[]) => {
        const formattedCategories = data.map(category => ({
          ...category,
          budgets: category.budgets || {},
        }))
        console.log('Setting categories in store:', formattedCategories)
        setCategories(formattedCategories)
      })
  }, [setCategories])

  // Debug logs for store state
  useEffect(() => {
    console.log('Current categories in store:', categories)
    console.log('Current costs in store:', costs)
  }, [categories, costs])

  const handleSubmit = async (data: CategoryFormData) => {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const newCategory = await res.json()
    console.log('Adding new category to store:', newCategory)
    setCategories([...categories, newCategory])
    setOpen(false)
  }

  const handleUpdateCategory = async (categoryId: string, data: CategoryFormData) => {
    try {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!res.ok) throw new Error('Failed to update category')
      
      const updatedCategory = await res.json()
      console.log('Updating category in store:', updatedCategory)
      setCategories(categories.map(c => 
        c.id === categoryId ? updatedCategory : c
      ))
    } catch (error) {
      console.error('Failed to update category:', error)
    }
  }

  const handleUpdateBudget = async (categoryId: string, year: string, value: number) => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return

    const updatedCategory = {
      ...category,
      budgets: {
        ...category.budgets,
        [year]: value
      }
    }

    try {
      await fetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgets: updatedCategory.budgets }),
      })

      console.log('Updating budget in store:', {
        categoryId,
        year,
        value,
        updatedCategory
      })
      setCategories(categories.map(c => 
        c.id === categoryId ? updatedCategory : c
      ))
    } catch (error) {
      console.error('Failed to update budget:', error)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Budget Categories</h2>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Add Category
        </Button>
      </div>

      <CategoryUploader />
      <div className="mt-6">
        <CategoryForm 
          open={open} 
          onOpenChange={setOpen}
          onSubmit={handleSubmit} 
          categories={categories} 
        />
        <EnhancedCategoryTree 
          categories={categories} 
          years={[2023, 2024, 2025]}
          onUpdateBudget={handleUpdateBudget}
          onUpdateCategory={handleUpdateCategory}
        />
      </div>
    </div>
  )
}