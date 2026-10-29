import express from "express";
const router = express.Router();

import { validateRequest, validateFile } from "#src/middleware/validation.js";
import verifyRoles from "#src/middleware/verifyRoles.js";
import upload from "#src/middleware/uploadMiddleware.js";
import ROLES_LIST from "#src/config/roles_list.js";
import { uploadLimiter } from "#src/config/rateLimiter.js";
import { uploadAvatarSchema } from "#src/middleware/schemas/userSchema/avatarSchema.js";
import { updateRestaurantSchema } from "#src/middleware/schemas/restaurantSchema/restaurantSchema.js";
import {
  handleGetRestaurant,
  handleUpdateRestaurant,
  handleUploadLogo,
  handleDeleteLogo,
} from "#src/controllers/data/restaurantController.js";

// verifyJWT is applied in server.ts. Reading: any logged-in user. Writing: Admin (owner) only.
const adminOnly = verifyRoles(ROLES_LIST.Admin);

router.get("/", handleGetRestaurant);
router.patch("/", adminOnly, validateRequest(updateRestaurantSchema), handleUpdateRestaurant);

router.post("/logo", adminOnly, uploadLimiter, upload.single("logo"), validateFile(uploadAvatarSchema), handleUploadLogo);
router.delete("/logo", adminOnly, handleDeleteLogo);

export default router;