// src/middleware/schemas/userSchema/userSchema.ts
import { z } from "zod";
import { usernameRe } from "#src/utils/regex.js";


// ---------------------------------------------------------------
// Reusable fields
// ---------------------------------------------------------------
const emailField = z
  .string({ error: "البريد الإلكتروني مطلوب" })
  .trim()
  .toLowerCase() // transforms (unlike .lowercase(), which only validates)
  .max(255, "البريد الإلكتروني طويل جداً")
  .pipe(z.email("بريد إلكتروني غير صالح"));

const usernameField = z
  .string({ error: "اسم المستخدم مطلوب" })
  .trim()
  .min(3)
  .max(30)
  .regex(usernameRe, "اسم المستخدم: حروف وأرقام، ويمكن فاصل واحد (مسافة . _ -) بين الكلمات");

// Passwords are NOT trimmed. bcrypt only uses the first 72 BYTES.
const newPasswordField = z
  .string({ error: "كلمة المرور مطلوبة" })
  .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "كلمة المرور طويلة جداً (الحد الأقصى 72 بايت)",
  );

const RESERVED_SLUGS = [
  "admin", "api", "app", "login", "logout", "register",
  "menu", "dashboard", "www", "static", "assets", "health",
];

// Must match the DB CHECK: ^[a-z0-9]+(-[a-z0-9]+)*$
const slugField = z
  .string({ error: "الرابط (slug) مطلوب" })
  .trim()
  .toLowerCase()
  .min(3, "الرابط يجب أن يكون 3 أحرف على الأقل")
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "الرابط: أحرف إنجليزية صغيرة وأرقام وشرطات فقط")
  .refine((s) => !RESERVED_SLUGS.includes(s), "هذا الرابط محجوز");

// ---------------------------------------------------------------
// Public: register a new restaurant + its first Admin
// (role is NOT accepted from the client; the controller sets it to Admin)
// ---------------------------------------------------------------
const registerRestaurantSchema = z.object({
  body: z.strictObject({
      inviteCode: z.string({ error: "كود الدعوة مطلوب" }).trim().min(16).max(200),
    restaurantName: z.string({ error: "اسم المطعم مطلوب" }).trim().min(2).max(150),
    slug: slugField,
    username: usernameField,
    email: emailField,
    password: newPasswordField,
  }),
});


// ---------------------------------------------------------------
// Update own profile: ONLY username / email (no roles, no avatar)
// ---------------------------------------------------------------
const updateUserByIdSchema = z.object({
  body: z
    .strictObject({
      username: usernameField.optional(),
      email: emailField.optional(),
    })
    .refine((d) => Object.keys(d).length > 0, {
      message: "يجب إرسال حقل واحد على الأقل للتحديث",
    }),
});

const loginUserSchema = z.object({
  body: z.strictObject({
    email: emailField,
    password: z.string().min(1, "كلمة المرور مطلوبة").max(128),
  }),
});

const changePasswordSchema = z.object({
  body: z
    .strictObject({
      currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة").max(128),
      newPassword: newPasswordField,
    })
    .refine((d) => d.currentPassword !== d.newPassword, {
      message: "كلمة المرور الجديدة يجب أن تختلف عن الحالية",
      path: ["newPassword"],
    }),
});

const deleteSessionByIdSchema = z.object({
  params: z.object({
    sessionId: z.uuid("معرّف الجلسة غير صالح"),
  }),
});


const getSessionsQuerySchema = z.object({
  query: z.object({
    sortBy: z
      .enum(["user_agent", "ip_address", "expires_at", "created_at", "updated_at"])
      .optional(),
    sortOrder: z.enum(["ASC", "DESC"]).optional(),
  }),
});

export {
  registerRestaurantSchema,
  updateUserByIdSchema,
  loginUserSchema,
  changePasswordSchema,
  deleteSessionByIdSchema,
  getSessionsQuerySchema,
  emailField,
  usernameField,
  newPasswordField
};

export type RegisterRestaurantType = z.infer<typeof registerRestaurantSchema>;
export type UpdateUserByIdType = z.infer<typeof updateUserByIdSchema>;
export type LoginUserType = z.infer<typeof loginUserSchema>;
export type ChangePasswordType = z.infer<typeof changePasswordSchema>;
export type GetSessionsQueryType = z.infer<typeof getSessionsQuerySchema>;
export type DeleteSessionByIdType = z.infer<typeof deleteSessionByIdSchema>;
