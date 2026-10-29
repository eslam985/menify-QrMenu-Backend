import { z } from "zod";

// slug and logo_url are NOT accepted here: the slug is immutable, the logo has its own endpoint
const updateRestaurantSchema = z.object({
  body: z.strictObject({
    name: z
      .string({ error: "اسم المطعم مطلوب" })
      .trim()
      .min(2, "اسم المطعم قصير جداً")
      .max(150, "اسم المطعم طويل جداً"),
  }),
});

export { updateRestaurantSchema };
export type UpdateRestaurantType = z.infer<typeof updateRestaurantSchema>;