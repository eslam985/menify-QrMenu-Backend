import express from "express";
const router = express.Router();

import handleRegister from "#src/controllers/auth/registerController.js";
import { registerRestaurantSchema } from "#src/middleware/schemas/userSchema/userSchema.js";
import { validateRequest } from "#src/middleware/validation.js";

// Public route: no verifyJWT / verifyRoles. The role is fixed to Admin inside the controller.
router.post("/", validateRequest(registerRestaurantSchema), handleRegister);

export default router;