import "dotenv/config";

import express from "express";
const app = express();
app.set("trust proxy", 1);

import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";

import gracefulShutdown from "#src/config/gracefulShutdown.js";
import registerRouter from "#src/routes/api/auth/register.js";
import refreshRouter from "#src/routes/api/auth/refresh.js";
import logoutRouter from "#src/routes/api/auth/logout.js";
import avatarRouter from "#src/routes/api/auth/avatar.js";
import loginRouter from "#src/routes/api/auth/login.js";
import userRouter from "#src/routes/api/auth/user.js";
import healthRouter from "#src/routes/health.js";
import errorHandler from "#src/middleware/errorHandler.js";
import { logger } from "#src/middleware/logEvents.js";
import verifyJWT from "#src/middleware/verifyJWT.js";
import corsOptions from "#src/config/corsOptions.js";
import notFound from "#src/middleware/notFound.js";
import pool from "#src/config/dbConn.js";
import {
  burstLimiter,
  generalLimiter,
  healthLimiter,
  loginLimiter,
  registerLimiter,
  refreshLimiter,
} from "#src/config/rateLimiter.js";
import { toNumber } from "./utils/paramAndQueryHelpes.js";
import categoriesRouter from "#src/routes/api/data/categories.js";
import menuItemsRouter from "#src/routes/api/data/menuItems.js";
import publicMenuRouter from "#src/routes/api/public/menu.js";
import { publicLimiter } from "#src/config/rateLimiter.js";
import staffRouter from "#src/routes/api/data/staff.js";
import restaurantRouter from "#src/routes/api/data/restaurant.js";
import offersRouter from "#src/routes/api/data/offers.js";


const PORT: number = toNumber(process.env.PORT) || 3000;

app.use(logger);
app.use(helmet());
app.use(cors(corsOptions)); // must allow credentials: true for the refresh cookie

app.use("/api/health", healthLimiter, healthRouter);
// Public menu BEFORE burst/general limiters: a whole café shares ONE IP
app.use("/api/public/menu", publicLimiter, publicMenuRouter);
// Public menu BEFORE burst/general limiters (we'll add it in the next step):
// app.use("/api/public", publicLimiter, publicMenuRouter);

app.use(burstLimiter);
app.use(generalLimiter);

app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// ---------------- Public routes (no access token) ----------------
app.use("/api/auth/register", registerLimiter, registerRouter);
app.use("/api/auth/login", loginLimiter, loginRouter);
app.use("/api/auth/refresh", refreshLimiter, refreshRouter);
app.use("/api/auth/logout", logoutRouter);
// Next step: app.use("/api/public", publicMenuRouter);   // GET /api/public/menu/:slug

// ---------------- Protected routes (verifyJWT per prefix) ----------------
app.use("/api/avatar", verifyJWT, avatarRouter);
app.use("/api/user", verifyJWT, userRouter);
app.use("/api/categories", verifyJWT, categoriesRouter);
app.use("/api/menu-items", verifyJWT, menuItemsRouter);
app.use("/api/staff", verifyJWT, staffRouter);
app.use("/api/restaurant", verifyJWT, restaurantRouter);
app.use("/api/offers", verifyJWT, offersRouter);


// Unknown routes now return 404 for everyone (not 401)
app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, "0.0.0.0", () =>
  console.log(`server running in port ${PORT}`),
);
gracefulShutdown(server, pool);

export default app;
