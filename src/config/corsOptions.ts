import type { CorsOptions } from "cors";
import allowedOrigins from "./allowedOrigins.js";

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not Allowed By CORS"));
    }
  },

  credentials: true,
  maxAge: 86400, // 24 ساعة بالثواني
  optionsSuccessStatus: 200,
  exposedHeaders: [
    "Retry-After",
    "RateLimit-Reset",
    "RateLimit-Limit",
    "RateLimit-Remaining",
    "RateLimit-Policy",
  ],
};

export default corsOptions;
