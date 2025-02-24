// components/budget/category-tree.tsx
import React from 'react'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Category } from '@/types/budget'

interface CategoryTreeProps {
  categories: Category[]
  years: number[]
}

export function CategoryTree({ categories, years }: CategoryTreeProps) {
  const getChildCategories = (parentId: string | null): Category[] => {
    return categories.filter(category => category.parentId === parentId)
  }

  const renderCategory = (category: Category, level: number) => {
    const children = getChildCategories(category.id)
    const isSum = category.name.toLowerCase().includes('summe')
    
    return (
      <React.Fragment key={category.id}>
        <TableRow className={`
          ${isSum ? 'bg-yellow-100 font-bold' : ''}
          ${level === 0 ? 'bg-orange-100' : ''}
          ${category.name.includes('incl. PP') ? 'bg-green-100' : ''}
        `}>
          <TableCell style={{ paddingLeft: `${level * 20}px` }}>
            {category.code}
          </TableCell>
          <TableCell>{category.name}</TableCell>
          {years.map((year) => (
            <TableCell key={year} className="text-right">
              {(category.budgets[year.toString()] || 0).toLocaleString('de-DE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </TableCell>
          ))}
          <TableCell className="text-right font-bold">
            {years.reduce((sum, year) => sum + (category.budgets[year.toString()] || 0), 0)
              .toLocaleString('de-DE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
          </TableCell>
        </TableRow>
        {children.map(child => renderCategory(child, level + 1))}
      </React.Fragment>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          {years.map((year) => (
            <TableHead key={year} className="text-right">{year}</TableHead>
          ))}
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {getChildCategories(null).map(category => renderCategory(category, 0))}
      </TableBody>
    </Table>
  )
}