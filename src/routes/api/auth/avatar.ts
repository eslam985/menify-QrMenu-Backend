import express from "express";
const router = express.Router();

import { validateFile, validateRequest } from "#src/middleware/validation.js";
import upload from "#src/middleware/uploadMiddleware.js";
import { uploadLimiter } from "#src/config/rateLimiter.js";
import {
  handleUploadAvatar,
  handleDeleteAvatar,
  handleSetAvatarFromHistory,
} from "#src/controllers/auth/avatarController.js";
import {
  uploadAvatarSchema,
  setAvatarFromHistorySchema,
} from "#src/middleware/schemas/userSchema/avatarSchema.js";

// verifyJWT is applied in server.ts. Order matters: limiter -> multer -> validation -> controller.
router.post(
  "/",
  uploadLimiter,
  upload.single("profileImage"),
  validateFile(uploadAvatarSchema),
  handleUploadAvatar,
);

router.delete("/", handleDeleteAvatar);

router.patch("/previous", validateRequest(setAvatarFromHistorySchema), handleSetAvatarFromHistory);

export default router;