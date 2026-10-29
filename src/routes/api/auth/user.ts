import express from "express";
const router = express.Router();

import { validateRequest } from "#src/middleware/validation.js";
import {
  updateUserByIdSchema,
  changePasswordSchema,
  deleteSessionByIdSchema,
  getSessionsQuerySchema,
} from "#src/middleware/schemas/userSchema/userSchema.js";
import {
  handleChangePassword,
  handleUpdateUserInfo,
  handleGetSessionsByUserId,
  handleRemoveSessionById,
  handleFindUserById,
} from "#src/controllers/auth/userController.js";

// verifyJWT is applied in server.ts for the whole /api/user prefix

router.get("/", handleFindUserById);
router.patch("/", validateRequest(updateUserByIdSchema), handleUpdateUserInfo);
router.patch("/password", validateRequest(changePasswordSchema), handleChangePassword);

router.get("/sessions", validateRequest(getSessionsQuerySchema), handleGetSessionsByUserId);
router.delete("/sessions/:sessionId", validateRequest(deleteSessionByIdSchema), handleRemoveSessionById);

export default router;