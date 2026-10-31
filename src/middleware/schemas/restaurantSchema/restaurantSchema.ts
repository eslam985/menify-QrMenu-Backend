import { z } from "zod";

// ---------------------------------------------------------------
// Reusable fields. "" is not accepted; send null to clear a field.
// ---------------------------------------------------------------
const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{6,18}$/, "رقم الهاتف غير صالح");

// https only: these links are shown to customers
const httpsUrlField = z
  .string()
  .trim()
  .max(300, "الرابط طويل جداً")
  .pipe(z.url("رابط غير صالح"))
  .refine((u) => u.startsWith("https://"), "يجب أن يبدأ الرابط بـ https://");

const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "الوقت بصيغة HH:MM (مثال 09:30)");

// null = closed that day. close < open means "closes after midnight".
const dayField = z
  .strictObject({ open: timeField, close: timeField })
  .refine((d) => d.open !== d.close, "وقت الفتح والإغلاق لا يمكن أن يتساويا")
  .nullable();

const workingHoursField = z.strictObject({
  sat: dayField,
  sun: dayField,
  mon: dayField,
  tue: dayField,
  wed: dayField,
  thu: dayField,
  fri: dayField,
});

const timezoneField = z
  .string()
  .trim()
  .max(50)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "المنطقة الزمنية غير صالحة (مثال Africa/Cairo)");

// ---------------------------------------------------------------
// PATCH /api/restaurant
// slug and logo_url are NOT accepted: the slug is immutable, the logo has its own endpoint.
// Every field is optional; the nullable ones can be cleared with null.
// ---------------------------------------------------------------
const updateRestaurantSchema = z.object({
  body: z
    .strictObject({
      name: z.string({ error: "اسم المطعم مطلوب" }).trim().min(2, "اسم المطعم قصير جداً").max(150),
      description: z.string().trim().min(1).max(300, "الوصف طويل جداً (الحد الأقصى 300)").nullable(),
      phone: phoneField.nullable(),
      whatsapp: phoneField.nullable(),
      address: z.string().trim().min(1).max(300, "العنوان طويل جداً").nullable(),
      maps_url: httpsUrlField.nullable(),
      instagram_url: httpsUrlField.nullable(),
      facebook_url: httpsUrlField.nullable(),
      currency: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}$/, "رمز العملة من 3 حروف (مثال EGP)"),
      timezone: timezoneField,
      working_hours: workingHoursField.nullable(),
    })
    .partial()
    .refine((d) => Object.keys(d).length > 0, {
      message: "يجب إرسال حقل واحد على الأقل للتحديث",
    }),
});

export { updateRestaurantSchema };
export type UpdateRestaurantType = z.infer<typeof updateRestaurantSchema>;