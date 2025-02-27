import { createApiHandler } from '@/lib/api/api-handler';

interface AccountMappingData {
  internalCode: string;
  description: string;
  categoryId: string;
}

export const GET = createApiHandler(async (req, context, prisma) => {
  const mappings = await prisma.accountMapping.findMany({
    where: { active: true },
    include: {
      category: true
    }
  });
  
  return { data: mappings };
}, { allowedMethods: ['GET'] });

export const POST = createApiHandler(async (req, context, prisma) => {
  const data = await req.json() as AccountMappingData;
  
  // Validate required fields
  if (!data.internalCode || !data.categoryId) {
    return {
      error: 'internalCode and categoryId are required',
      data: null
    };
  }
  
  // Check if mapping already exists
  const existing = await prisma.accountMapping.findUnique({
    where: { internalCode: data.internalCode }
  });
  
  if (existing) {
    // Update existing mapping
    const updated = await prisma.accountMapping.update({
      where: { id: existing.id },
      data: {
        categoryId: data.categoryId,
        description: data.description,
        active: true
      },
      include: {
        category: true
      }
    });
    
    return { data: updated };
  }
  
  // Create new mapping
  const mapping = await prisma.accountMapping.create({
    data,
    include: {
      category: true
    }
  });
  
  return { data: mapping };
}, { allowedMethods: ['POST'] });