import express from "express";
const router = express.Router();

import { validateRequest } from "#src/middleware/validation.js";
import verifyRoles from "#src/middleware/verifyRoles.js";
import ROLES_LIST from "#src/config/roles_list.js";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
  reorderCategoriesSchema,
} from "#src/middleware/schemas/categorySchema/categorySchema.js";
import {
  handleGetCategories,
  handleGetCategoryById,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeleteCategory,
  handleReorderCategories,
} from "#src/controllers/data/categoryController.js";

// verifyJWT is applied in server.ts for the whole /api/categories prefix

// ---------- Read: any logged-in user ----------
router.get("/", handleGetCategories);

// ---------- Write: Editor and above ----------
router.post("/", verifyRoles(ROLES_LIST.Editor), validateRequest(createCategorySchema), handleCreateCategory);

// IMPORTANT: static path BEFORE "/:categoryId", otherwise "reorder" is treated as an id (-> 400)
router.patch("/reorder", verifyRoles(ROLES_LIST.Editor), validateRequest(reorderCategoriesSchema), handleReorderCategories);

// ---------- By id ----------
router.get("/:categoryId", validateRequest(categoryIdSchema), handleGetCategoryById);
router.patch("/:categoryId", verifyRoles(ROLES_LIST.Editor), validateRequest(updateCategorySchema), handleUpdateCategory);

// Deleting a category cascades to all its menu items: Admin (restaurant owner) only
router.delete("/:categoryId", verifyRoles(ROLES_LIST.Admin), validateRequest(categoryIdSchema), handleDeleteCategory);

export default router;