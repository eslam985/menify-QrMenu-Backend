import express from "express";
const router = express.Router();

import { validateRequest, validateFile } from "#src/middleware/validation.js";
import verifyRoles from "#src/middleware/verifyRoles.js";
import upload from "#src/middleware/uploadMiddleware.js";
import ROLES_LIST from "#src/config/roles_list.js";
import { menuImageLimiter } from "#src/config/rateLimiter.js";
import { uploadAvatarSchema } from "#src/middleware/schemas/userSchema/avatarSchema.js"; // only checks req.file (mimetype + size)
import {
  listMenuItemsSchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  setAvailabilitySchema,
  itemIdSchema,
  reorderMenuItemsSchema,
} from "#src/middleware/schemas/menuItemSchema/menuItemSchema.js";
import {
  handleGetMenuItems,
  handleGetMenuItemById,
  handleCreateMenuItem,
  handleUpdateMenuItem,
  handleSetAvailability,
  handleUploadMenuItemImage,
  handleDeleteMenuItemImage,
  handleDeleteMenuItem,
  handleReorderMenuItems,
} from "#src/controllers/data/menuItemController.js";

// verifyJWT is applied in server.ts for the whole /api/menu-items prefix
// Order in every route: role -> (limiter) -> validation -> controller

// ---------- Read: any logged-in user ----------
router.get("/", validateRequest(listMenuItemsSchema), handleGetMenuItems);

// ---------- Write: Editor and above ----------
router.post("/", verifyRoles(ROLES_LIST.Editor), validateRequest(createMenuItemSchema), handleCreateMenuItem);

// IMPORTANT: static path BEFORE "/:itemId", otherwise "reorder" is treated as an id (-> 400)
router.patch("/reorder", verifyRoles(ROLES_LIST.Editor), validateRequest(reorderMenuItemsSchema), handleReorderMenuItems);

// ---------- By id ----------
router.get("/:itemId", validateRequest(itemIdSchema), handleGetMenuItemById);
router.patch("/:itemId", verifyRoles(ROLES_LIST.Editor), validateRequest(updateMenuItemSchema), handleUpdateMenuItem);
router.delete("/:itemId", verifyRoles(ROLES_LIST.Editor), validateRequest(itemIdSchema), handleDeleteMenuItem);

// Quick "out of stock" toggle
router.patch(
  "/:itemId/availability",
  verifyRoles(ROLES_LIST.Editor),
  validateRequest(setAvailabilitySchema),
  handleSetAvailability,
);

// ---------- Image ----------
// limiter -> params check (before spending memory on the upload) -> multer -> file check -> controller
router.post(
  "/:itemId/image",
  verifyRoles(ROLES_LIST.Editor),
  menuImageLimiter,
  validateRequest(itemIdSchema),
  upload.single("image"),
  validateFile(uploadAvatarSchema),
  handleUploadMenuItemImage,
);
router.delete("/:itemId/image", verifyRoles(ROLES_LIST.Editor), validateRequest(itemIdSchema), handleDeleteMenuItemImage);

export default router;