// src/config/cookieOptions.ts
import type { CookieOptions } from "express";

const isProduction = process.env.NODE_ENV === "production";

// Single source of truth for the session lifetime (DB expires_at + cookie maxAge)
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/api/auth",
  maxAge: SESSION_TTL_MS,
};

export default cookieOptions;