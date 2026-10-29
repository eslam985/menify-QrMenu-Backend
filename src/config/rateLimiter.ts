import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Options } from "express-rate-limit";

const base = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
} satisfies Partial<Options>;

const msg = (message: string) => ({ success: false, message });

// Global protection against loops / abuse (applied AFTER the public menu routes)
const burstLimiter = rateLimit({
  ...base,
  windowMs: 1000,
  limit: 15,
  message: msg("Too many rapid requests, please slow down"),
});

const generalLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 200,
  message: msg("Too many requests"),
});

const healthLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 30,
  message: msg("Too many health check requests"),
});

// Public menu: generous, because a whole café can share ONE IP behind the same WiFi.
// Real protection here comes from CDN caching (Cache-Control), not from the limiter.
const publicLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 600,
  message: msg("Too many requests"),
});

// Login: successful logins don't count, so legit users are never locked out
const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: msg("Too many login attempts, try again later"),
});

// Every registration creates a restaurant: strict, to stop spam
const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: msg("Too many registration attempts, try again later"),
});

// Frontend refreshes on every page load + every 15 min
const refreshLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: msg("Too many refresh attempts"),
});

// Each upload costs Cloudinary credits. Keyed by user (runs after verifyJWT).
const uploadLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ""),
  message: msg("تجاوزت الحد المسموح من رفع الصور، حاول لاحقاً"),
});

// Menu item images: a restaurant uploads many more images than avatars. Keyed by user.
const menuImageLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ""),
  message: msg("تجاوزت الحد المسموح من رفع الصور، حاول لاحقاً"),
});


// Each creation runs bcrypt (CPU heavy). Keyed by user (runs after verifyJWT).
const staffCreateLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ""),
  message: msg("تجاوزت الحد المسموح لإضافة الموظفين، حاول لاحقاً"),
});

export {
  burstLimiter,
  generalLimiter,
  healthLimiter,
  publicLimiter,
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  uploadLimiter,
  menuImageLimiter,
  staffCreateLimiter
};