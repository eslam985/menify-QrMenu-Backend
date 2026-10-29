import express from "express";
const router = express.Router();

import handleLogout from "#src/controllers/auth/logoutController.js";

router.post("/", handleLogout);

export default router;
