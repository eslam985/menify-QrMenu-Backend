import express from "express";
const router = express.Router();

import { handleGetPublicRestaurants } from "#src/controllers/data/publicRestaurantsController.js";

// GET /api/public/restaurants  — no auth required
router.get("/", handleGetPublicRestaurants);

export default router;
