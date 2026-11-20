// src/routes/api/auth/passwordReset.ts
import { Router } from "express";
import {
  handleRequestPasswordReset,
  handleResetPassword,
} from "#src/controllers/auth/passwordResetController.js";
import { validateRequest } from "#src/middleware/validation.js";
import {
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "#src/middleware/schemas/userSchema/userSchema.js";

const router = Router();

/** Step 1: Request OTP via email */
router.post(
  "/request",
  validateRequest(requestPasswordResetSchema),
  handleRequestPasswordReset,
);

/** Step 2: Verify OTP & set new password */
router.post(
  "/confirm",
  validateRequest(resetPasswordSchema),
  handleResetPassword,
);

export default router;
