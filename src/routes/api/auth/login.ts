import express from "express";
const router = express.Router();

import { loginUserSchema } from "#src/middleware/schemas/userSchema/userSchema.js";
import handleLogin from "#src/controllers/auth/loginController.js";
import { validateRequest } from "#src/middleware/validation.js";

router.post("/", validateRequest(loginUserSchema), handleLogin);

export default router;
