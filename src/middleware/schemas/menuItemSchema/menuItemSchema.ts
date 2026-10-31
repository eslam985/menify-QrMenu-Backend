import { z } from "zod";

// ---------------------------------------------------------------
// Reusable fields
// ---------------------------------------------------------------
// No regex on purpose: "Tea & Coffee", "Burger (Large)", "كنافة - بالقشطة" are valid
const titleField = z
  .string({ error: "اسم الصنف مطلوب" })
  .trim()
  .min(1, "اسم الصنف مطلوب")
  .max(150, "اسم الصنف طويل جداً (الحد الأقصى 150 حرف)");

// "" is stored as NULL. null clears the description.
const descriptionField = z
  .string({ error: "الوصف يجب أن يكون نصاً" })
  .trim()
  .max(1000, "الوصف طويل جداً (الحد الأقصى 1000 حرف)")
  .transform((v) => (v === "" ? null : v))
  .nullable();

// Max 2 decimals, matches NUMERIC(10,2). The epsilon avoids float noise (e.g. 1.1 * 100).
const priceField = z
  .number({ error: "السعر يجب أن يكون رقماً" })
  .min(0, "السعر لا يمكن أن يكون سالباً")
  .max(1_000_000, "السعر كبير جداً")
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, {
    message: "السعر يجب ألا يتجاوز خانتين عشريتين",
  });

const categoryIdField = z.uuid("معرّف التصنيف غير صالح");
const isAvailableField = z.boolean({ error: "حالة التوفر يجب أن تكون true أو false" });

const itemIdParams = z.object({
  itemId: z.uuid("معرّف الصنف غير صالح"),
});

// ---------------------------------------------------------------
// GET /api/menu-items?category_id=&is_available=
// Query values are strings, so is_available is transformed to a boolean
// ---------------------------------------------------------------
const listMenuItemsSchema = z.object({
  query: z.strictObject({
    category_id: categoryIdField.optional(),
    is_available: z
      .enum(["true", "false"], { error: "is_available يجب أن تكون true أو false" })
      .transform((v) => v === "true")
      .optional(),
  }),
});

// ---------------------------------------------------------------
// POST /api/menu-items
// No restaurant_id, no image_url, no display_order:
//   - restaurant_id comes from req.restaurantId
//   - the image is uploaded through its own endpoint
//   - the item is appended at the end of its category
// ---------------------------------------------------------------
const createMenuItemSchema = z.object({
  body: z.strictObject({
    category_id: categoryIdField,
    title: titleField,
    description: descriptionField.optional(),
    price: priceField,
    is_available: isAvailableField.optional(),
  }),
});

// ---------------------------------------------------------------
// PATCH /api/menu-items/:itemId
// category_id here = move the item to another category (of the same restaurant)
// ---------------------------------------------------------------
const updateMenuItemSchema = z.object({
  params: itemIdParams,
  body: z
    .strictObject({
      category_id: categoryIdField.optional(),
      title: titleField.optional(),
      description: descriptionField.optional(),
      price: priceField.optional(),
      is_available: isAvailableField.optional(),
    })
    .refine((d) => Object.keys(d).length > 0, {
      message: "يجب إرسال حقل واحد على الأقل للتحديث",
    }),
});

// ---------------------------------------------------------------
// PATCH /api/menu-items/:itemId/availability  (quick "out of stock" toggle)
// ---------------------------------------------------------------
const setAvailabilitySchema = z.object({
  params: itemIdParams,
  body: z.strictObject({
    is_available: isAvailableField,
  }),
});

// ---------------------------------------------------------------
// GET / DELETE /api/menu-items/:itemId  (+ DELETE /:itemId/image)
// ---------------------------------------------------------------
const itemIdSchema = z.object({
  params: itemIdParams,
});

// ---------------------------------------------------------------
// PATCH /api/menu-items/reorder
// Reorders the items of ONE category: ids[0] -> 0, ids[1] -> 1, ...
// ---------------------------------------------------------------
const reorderMenuItemsSchema = z.object({
  body: z.strictObject({
    category_id: categoryIdField,
    ids: z
      .array(z.uuid("معرّف صنف غير صالح"), { error: "قائمة المعرّفات مطلوبة" })
      .min(1, "يجب إرسال صنف واحد على الأقل")
      .max(500, "عدد الأصناف كبير جداً")
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "المعرّفات يجب ألا تتكرر",
      }),
  }),
});

export {
  listMenuItemsSchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  setAvailabilitySchema,
  itemIdSchema,
  reorderMenuItemsSchema,
  priceField,
};

export type ListMenuItemsType = z.infer<typeof listMenuItemsSchema>;
export type CreateMenuItemType = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemType = z.infer<typeof updateMenuItemSchema>;
export type SetAvailabilityType = z.infer<typeof setAvailabilitySchema>;
export type MenuItemIdType = z.infer<typeof itemIdSchema>;
export type ReorderMenuItemsType = z.infer<typeof reorderMenuItemsSchema>;