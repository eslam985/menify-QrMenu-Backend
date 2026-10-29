import express from "express";
const router = express.Router();

import { validateRequest } from "#src/middleware/validation.js";
import { publicMenuSchema } from "#src/middleware/schemas/publicMenuSchema/publicMenuSchema.js";
import { handleGetPublicMenu } from "#src/controllers/data/publicMenuController.js";

router.get("/:slug", validateRequest(publicMenuSchema), handleGetPublicMenu);

export default router;