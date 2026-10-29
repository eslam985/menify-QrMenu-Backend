import express from "express";
const router = express.Router();

import { validateRequest } from "#src/middleware/validation.js";
import verifyRoles from "#src/middleware/verifyRoles.js";
import ROLES_LIST from "#src/config/roles_list.js";
import { staffCreateLimiter } from "#src/config/rateLimiter.js";
import {
  createStaffSchema,
  updateStaffRoleSchema,
  staffIdSchema,
} from "#src/middleware/schemas/staffSchema/staffSchema.js";
import {
  handleGetStaff,
  handleCreateStaff,
  handleUpdateStaffRole,
  handleDeleteStaff,
} from "#src/controllers/data/staffController.js";

// verifyJWT is applied in server.ts for the whole /api/staff prefix.
// EVERY route here is Admin only (restaurant owner): Editors and Viewers get 403.
const adminOnly = verifyRoles(ROLES_LIST.Admin);

router.get("/", adminOnly, handleGetStaff);

router.post("/", adminOnly, staffCreateLimiter, validateRequest(createStaffSchema), handleCreateStaff);

router.patch("/:staffId", adminOnly, validateRequest(updateStaffRoleSchema), handleUpdateStaffRole);

router.delete("/:staffId", adminOnly, validateRequest(staffIdSchema), handleDeleteStaff);

export default router;