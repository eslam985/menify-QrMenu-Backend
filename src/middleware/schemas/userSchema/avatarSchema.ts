// backend/src/middleware/schemas/avatarSchema.ts
import { z } from "zod";

const uploadAvatarSchema = z.object({
  file: z.object(
    {
      mimetype: z
        .string()
        .regex(
          /^image\/(jpeg|png|webp|jpg)$/,
          "يجب أن يكون الملف صورة (jpeg, png, webp, jpg)",
        ),
      size: z
        .number()
        .max(5 * 1024 * 1024, "حجم الصورة يجب ألا يتجاوز 5 ميجابايت"),
    },
    { error: "لم يتم إرسال أي صورة" },
  ),
});

const setAvatarFromHistorySchema = z.object({
  body: z.object({
    chosenAvatarUrl: z
      .string({ error: "رابط الصورة المختارة مطلوب" })
      .trim()
      .regex(
        /^https:\/\/res\.cloudinary\.com\//,
        "يجب أن تكون الصورة مرفوعة على خوادم Cloudinary الرسمية",
      ),
  }),
});

export { uploadAvatarSchema, setAvatarFromHistorySchema };

export type SetAvatarFromHistoryType = z.infer<typeof setAvatarFromHistorySchema>
export type UploadAvatarType = z.infer<typeof uploadAvatarSchema>