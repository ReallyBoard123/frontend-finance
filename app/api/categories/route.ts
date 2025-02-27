import { createApiHandler } from '@/lib/api/api-handler';
import { CategoryFormData } from '@/types/category';
import { z } from 'zod';

const categorySchema = z.object({
  code: z.string().regex(/^[A-Z0-9]+$/, "Must be an alphanumeric code"),
  name: z.string().min(1, "Name is required"),
  parentId: z.string().nullable(),
  budgets: z.record(z.string(), z.number().min(0, "Budget must be positive")).optional(),
  color: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  isLeaf: z.boolean().optional()
});

export const GET = createApiHandler(async (req, context, prisma) => {
  const categories = await prisma.category.findMany({
    include: {
      children: true,
      parent: true
    }
  });

  return {
    data: categories.map(category => ({
      ...category,
      budgets: category.budgets as Record<string, number>
    }))
  };
}, { allowedMethods: ['GET'] });

export const POST = createApiHandler(async (req, context, prisma) => {
  const data = await req.json() as CategoryFormData;
  const validatedData = categorySchema.parse(data);
  
  const category = await prisma.category.create({
    data: {
      code: validatedData.code,
      name: validatedData.name,
      parentId: validatedData.parentId === 'none' ? null : validatedData.parentId,
      budgets: validatedData.budgets || {},
      color: validatedData.color,
      isLeaf: validatedData.isLeaf ?? true,
      metadata: validatedData.metadata || {}
    },
    include: {
      children: true,
      parent: true
    }
  });

  // If this category has a parent, update the parent's isLeaf status
  if (category.parentId) {
    await prisma.category.update({
      where: { id: category.parentId },
      data: { isLeaf: false }
    });
  }
  
  return { data: category };
}, { allowedMethods: ['POST'] });