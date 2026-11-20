// src/controllers/auth/passwordResetController.ts
import bcrypt from "bcrypt";
import { randomInt } from "node:crypto";
import type { RequestHandler } from "express";

import User from "#src/service/user/userService.js";
import transporter from "#src/config/mailer.js";
import { passwordResetEmailHtml } from "#src/utils/emailTemplates.js";
import { BCRYPT_ROUNDS } from "#src/config/constants.js";
import type {
  RequestPasswordResetType,
  ResetPasswordType,
} from "#src/middleware/schemas/userSchema/userSchema.js";

/** How long (in ms) the OTP is valid */
const OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** Generates a cryptographically secure 6-digit numeric OTP */
const generateOtp = (): string =>
  randomInt(100_000, 999_999).toString();

// ---------------------------------------------------------------
// POST /api/auth/password-reset/request
// Body: { email }
// ---------------------------------------------------------------
export const handleRequestPasswordReset: RequestHandler = async (req, res, next) => {
  try {
    const { email } = req.body as RequestPasswordResetType["body"];

    const user = await User.findByEmail(email.trim().toLowerCase());

    // ⚠️ Always return 200 to prevent user enumeration (attacker cannot tell if email exists)
    if (!user) {
      res.status(200).json({
        success: true,
        message: "إذا كان البريد الإلكتروني مسجلاً، ستصلك رسالة بكود التحقق.",
      });
      return;
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Store the hashed OTP
    await User.createPasswordResetToken(user.id, otp, expiresAt);

    // Send email — failure is logged but does NOT return 500 to the client.
    // The token is already committed; the user can retry from the frontend.
    try {
      await transporter.sendMail({
        from: `"Tabloz" <${process.env.EMAIL_USER}>`,
        replyTo: process.env.EMAIL_USER,
        to: email,
        subject: "إعادة تعيين كلمة المرور - Tabloz", // شيل الإيموجي من العنوان بيقلل الـ Spam
        text: `مرحباً ${user.username}، رمز إعادة تعيين كلمة المرور الخاص بك في Tabloz هو: ${otp} (صالح لمدة 15 دقيقة).`,
        html: passwordResetEmailHtml(user.username, otp),
      });

    } catch (mailErr) {
      console.error("[passwordReset] Failed to send email:", mailErr);
      // Still return success — avoids leaking whether email exists
    }

    res.status(200).json({
      success: true,
      message: "إذا كان البريد الإلكتروني مسجلاً، ستصلك رسالة بكود التحقق.",
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------
// POST /api/auth/password-reset/confirm
// Body: { email, otp, newPassword }
// ---------------------------------------------------------------
export const handleResetPassword: RequestHandler = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body as ResetPasswordType["body"];

    // We need the user to find the token (token is linked to user_id, not email directly)
    const user = await User.findByEmail(email.trim().toLowerCase());

    // Generic error: don't reveal whether email exists or OTP is wrong
    const GENERIC_ERR = "البريد الإلكتروني أو رمز التحقق غير صحيح، أو انتهت صلاحية الرمز.";

    if (!user) {
      res.status(400).json({ success: false, message: GENERIC_ERR });
      return;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    const success = await User.consumeResetTokenAndChangePassword(
      user.id,
      otp,
      newPasswordHash,
    );


    if (!success) {
      res.status(400).json({ success: false, message: GENERIC_ERR });
      return;
    }

    res.status(200).json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.",
    });
  } catch (err) {
    next(err);
  }
};
