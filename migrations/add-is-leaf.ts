// migrations/add-is-leaf.ts
const { PrismaClient } = require('@prisma/client')
const migrationPrisma = new PrismaClient()

async function migrate() {
  try {
    const categories = await migrationPrisma.category.findMany()
    const parentCategoryIds = new Set(
      categories
        .filter((c: { id: any }) => categories.some((child: { parentId: any }) => child.parentId === c.id))
        .map((c: { id: any }) => c.id)
    )

    for (const category of categories) {
      await migrationPrisma.$executeRaw`
        UPDATE "Category"
        SET "isLeaf" = ${!parentCategoryIds.has(category.id)},
            "budgets" = ${parentCategoryIds.has(category.id) ? null : category.budgets}
        WHERE id = ${category.id}
      `
    }

    console.log('Migration completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await migrationPrisma.$disconnect()
  }
}

migrate()