// routes/health.js
import express from "express";
const router = express.Router();
import pool from "#src/config/dbConn.js";

import { RequestHandler } from 'express'

const health: RequestHandler = async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "ok",
      db: "up",
      uptime: process.uptime(),
    });

  } catch (err) {
    next(err)
  }
}

router.get("/", health);

export default router;
