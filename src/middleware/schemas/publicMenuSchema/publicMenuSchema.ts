import { z } from "zod";

// Same rules as the DB CHECK on restaurants.slug
const publicMenuSchema = z.object({
  params: z.object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(100)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "رابط المطعم غير صالح"),
  }),
});

export { publicMenuSchema };
export type PublicMenuParamsType = z.infer<typeof publicMenuSchema>;