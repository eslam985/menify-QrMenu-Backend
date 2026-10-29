// /src/middleware/schemas/IDS_schema.js
import { z } from "zod";

const createIdParamSchema = (paramName = "id") => {

  return z.object({
    params: z.object({
      [paramName]: z.coerce
        .number({ message: `الـ ${paramName} يجب أن يكون رقماً` })
        .int()
        .positive(`الـ ${paramName} يجب أن يكون رقماً موجباً`),
    }),
  });
  
};

const deleteManyIdsSchema = z.object({
  body: z.object({
    ids: z
      .array(
        z.coerce
          .number({ message: `الـ id يجب أن يكون رقماً` })
          .int()
          .positive(`الـ id يجب أن يكون رقماً موجباً`),
      )
      .min(1, "لازم تبعت id واحد على الأقل")
      .max(100, "اقصى عدد 100 مرة واحدة")
      .refine((arr) => new Set(arr).size === arr.length, {
        message: "ممنوع تكرر نفس الـ id",
      }),
  }),
});

export { createIdParamSchema, deleteManyIdsSchema };

export type CreateIdParamType = z.infer<typeof createIdParamSchema>;
export type DeleteManyIdsType = z.infer<typeof deleteManyIdsSchema>;
