///backend/middleware/schemas/paginationSchema.ts
import { z } from "zod";

// 1. السكيما الأساسية: للترقيم فقط (page, limit)
const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

// 2. السكيما الممتدة: للترقيم مع البحث (page, limit, search)
const searchPaginationSchema = z.object({
  query: paginationSchema.shape.query.extend({
    search: z.string().trim().optional(),
  }),
});

export { paginationSchema, searchPaginationSchema };

export type SearchPaginationType = z.infer<typeof searchPaginationSchema>;
export type PaginationType = z.infer<typeof paginationSchema>;
