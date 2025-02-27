import { createApiHandler } from '@/lib/api/api-handler';
import { CategoryFormData } from '@/types/category';
import { z } from 'zod';

const updateCategorySchema = z.object({
  code: z.string().regex(/^[A-Z0-9]+$/).optional(),
  name: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
  budgets: z.record(z.string(), z.number().min(0)).optional(),
  color: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  isLeaf: z.boolean().optional()
});

export const PATCH = createApiHandler(async (req, context, prisma) => {
  const { id } = context.params;
  const data = await req.json() as Partial<CategoryFormData>;
  const validatedData = updateCategorySchema.parse(data);

  // Handle special case for parentId
  if (validatedData.parentId === 'none') {
    validatedData.parentId = null;
  }

  const category = await prisma.category.update({
    where: { id },
    data: validatedData,
    include: {
      children: true,
      parent: true
    }
  });

  // Update parent's isLeaf status if parent changed
  if (data.parentId && data.parentId !== 'none') {
    await prisma.category.update({
      where: { id: data.parentId },
      data: { isLeaf: false }
    });
  }

  return { data: category };
}, { allowedMethods: ['PATCH', 'PUT'] });

export const DELETE = createApiHandler(async (req, context, prisma) => {
  const { id } = context.params;
  
  // Check if category has children
  const childrenCount = await prisma.category.count({
    where: { parentId: id }
  });
  
  if (childrenCount > 0) {
    return { 
      error: 'Cannot delete category with children',
      data: null
    };
  }
  
  // Check if category is used in transactions
  const transactionsCount = await prisma.transaction.count({
    where: { categoryId: id }
  });
  
  if (transactionsCount > 0) {
    return { 
      error: 'Cannot delete category used in transactions',
      data: null
    };
  }
  
  const deletedCategory = await prisma.category.delete({
    where: { id }
  });
  
  return { data: deletedCategory };
}, { allowedMethods: ['DELETE'] });