import { z } from "zod";

// ---------------------------------------------------------------
// Reusable fields
// ---------------------------------------------------------------
// No regex on purpose: "Tea & Coffee", "حلويات - شرقية", "Burger (Large)" are valid names.
const nameField = z
  .string({ error: "اسم التصنيف مطلوب" })
  .trim()
  .min(1, "اسم التصنيف مطلوب")
  .max(100, "اسم التصنيف طويل جداً (الحد الأقصى 100 حرف)");

const displayOrderField = z
  .number({ error: "ترتيب العرض يجب أن يكون رقماً" })
  .int("ترتيب العرض يجب أن يكون رقماً صحيحاً")
  .min(0, "ترتيب العرض لا يمكن أن يكون سالباً")
  .max(10_000);

const categoryIdParams = z.object({
  categoryId: z.uuid("معرّف التصنيف غير صالح"),
});

// ---------------------------------------------------------------
// POST /api/categories
// restaurant_id is NEVER accepted from the client (it comes from req.restaurantId)
// display_order is optional: when omitted the service appends the category at the end
// ---------------------------------------------------------------
const createCategorySchema = z.object({
  body: z.strictObject({
    name: nameField,
    display_order: displayOrderField.optional(),
  }),
});

// ---------------------------------------------------------------
// PATCH /api/categories/:categoryId
// ---------------------------------------------------------------
const updateCategorySchema = z.object({
  params: categoryIdParams,
  body: z
    .strictObject({
      name: nameField.optional(),
      display_order: displayOrderField.optional(),
    })
    .refine((d) => Object.keys(d).length > 0, {
      message: "يجب إرسال حقل واحد على الأقل للتحديث",
    }),
});

// ---------------------------------------------------------------
// GET / DELETE /api/categories/:categoryId
// ---------------------------------------------------------------
const categoryIdSchema = z.object({
  params: categoryIdParams,
});

// ---------------------------------------------------------------
// PATCH /api/categories/reorder
// The array order IS the new order: ids[0] -> 0, ids[1] -> 1, ...
// ---------------------------------------------------------------
const reorderCategoriesSchema = z.object({
  body: z.strictObject({
    ids: z
      .array(z.uuid("معرّف تصنيف غير صالح"), { error: "قائمة المعرّفات مطلوبة" })
      .min(1, "يجب إرسال تصنيف واحد على الأقل")
      .max(200, "عدد التصنيفات كبير جداً")
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "المعرّفات يجب ألا تتكرر",
      }),
  }),
});

export {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
  reorderCategoriesSchema,
  nameField as categoryNameField,
};

export type CreateCategoryType = z.infer<typeof createCategorySchema>;
export type UpdateCategoryType = z.infer<typeof updateCategorySchema>;
export type CategoryIdType = z.infer<typeof categoryIdSchema>;
export type ReorderCategoriesType = z.infer<typeof reorderCategoriesSchema>;