// src/middleware/errorHandler.ts
import type { ErrorRequestHandler } from "express";
import { logEvents } from "#src/middleware/logEvents.js";
import { CustomError } from "#src/utils/customErr.js";

const isProd = process.env.NODE_ENV === "production";

// Network / DB-availability error codes (pg + Node)
const DB_UNAVAILABLE = new Set([
  "ETIMEDOUT", "ENOTFOUND", "ECONNREFUSED", "ECONNRESET",
  "57P01", // admin_shutdown
  "53300", // too_many_connections
]);

// Postgres errors caused by bad client input -> 400
const PG_BAD_INPUT: Record<string, string> = {
  "22P02": "Invalid identifier or value format",
  "22001": "Value is too long",
  "23502": "A required field is missing",
  "23514": "A value violates the allowed constraints",
};

const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  // If the response already started, delegate to Express's default handler
  if (res.headersSent) {
    next(err);
    return;
  }

  // File logging only where the filesystem is writable (not on Vercel)
  if (!process.env.VERCEL) {
    try {
      logEvents(`${err.name}: ${err.message}`, "errLog.txt");
    } catch { /* logging must never break error handling */ }
  }
  console.error(err.stack ?? err);

  // 1) Our own errors
  if (err instanceof CustomError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  // 2) Database unreachable
  if (
    DB_UNAVAILABLE.has(err.code) ||
    err.message?.includes("Connection terminated due to connection timeout")
  ) {
    res.status(503).json({
      success: false,
      message: "حدثت مشكلة أثناء الاتصال بقاعدة البيانات، حاول مرة أخرى بعد قليل",
    });
    return;
  }

  // 3) Multer
  if (err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ success: false, message: "حجم الملف كبير جداً! الحد الأقصى 5 ميجابايت." });
    return;
  }
  if (err.name === "MulterError") {
    res.status(400).json({ success: false, message: `خطأ في تحميل الملف: ${err.message}` });
    return;
  }

  // 4) Body parser (malformed JSON / payload too large)
  if (err.type === "entity.too.large") {
    res.status(413).json({ success: false, message: "Request body is too large" });
    return;
  }
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ success: false, message: "Invalid JSON format provided in request body" });
    return;
  }

  // 5) PostgreSQL errors
  if (err.code === "23505") {
    res.status(409).json({ success: false, message: "Data already exists" });
    return;
  }
  if (err.code === "23503") {
    res.status(404).json({ success: false, message: "Referenced resource not found" });
    return;
  }
  if (PG_BAD_INPUT[err.code]) {
    res.status(400).json({ success: false, message: PG_BAD_INPUT[err.code] });
    return;
  }

  // 6) Anything else. Never leak internals on 5xx in production.
  const status =
    Number.isInteger(err.status) && err.status >= 400 && err.status < 600
      ? err.status
      : Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600
        ? err.statusCode
        : 500;

  res.status(status).json({
    success: false,
    message: status >= 500 && isProd ? "Internal Server Error" : err.message || "Internal Server Error",
  });
};

export default errorHandler;