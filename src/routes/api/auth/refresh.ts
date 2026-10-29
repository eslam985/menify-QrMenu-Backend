import express from "express";
const router = express.Router();

import handleRefreshToken from "#src/controllers/auth/refreshTokenController.js";

router.post("/", handleRefreshToken);

export default router;
