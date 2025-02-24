import { z } from "zod"

export const categorySchema = z.object({
  code: z.string().min(1).regex(/^F\d{4}$/, "Must be in format F####"),
  name: z.string().min(1),
  parentId: z.string().nullable(),
  budget: z.number().min(0),
  year: z.number().min(2023).max(2025)
})