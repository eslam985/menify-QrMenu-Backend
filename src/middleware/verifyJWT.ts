import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import type { DecodedToken } from "#src/types/userType/userType.js";
import User from "#src/service/user/userService.js";

const verifyJWT: RequestHandler = async (req, res, next) => {
  // Node lowercases header names, so `Authorization` never exists on req.headers
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Unauthorized: Access token is missing" });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ success: false, message: "Unauthorized: Access token is missing" });
    return;
  }

  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    res.status(500).json({ success: false, message: "Server error: Secret is missing" });
    return;
  }

  // 1) Verify signature + expiry (only JWT errors map to 401)
  let decoded: DecodedToken;
  try {
    decoded = jwt.verify(token, secret, { algorithms: ["HS256"] }) as DecodedToken;
  } catch {
    res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired access token" });
    return;
  }

  if (!decoded?.userId || !decoded?.sid) {
    res.status(401).json({ success: false, message: "Unauthorized: Invalid access token" });
    return;
  }


  // 2) Tenant + role + active session from the DB (source of truth).
  // A DB failure is NOT caught here: Express 5 forwards it to the error handler as a 500,
  // so a DB outage doesn't look like "invalid token" and log every user out.
  const ctx = await User.getAuthContext(decoded.userId, decoded.sid);

  if (!ctx) {
    res.status(401).json({
      success: false,
      message: "Unauthorized: Session ended. Please log in again.",
    });
    return;
  }

  if (!ctx.restaurant_active) {
    res.status(403).json({
      success: false,
      code: "SUBSCRIPTION_INACTIVE",
      message: "اشتراك المطعم متوقف، يرجى التواصل مع الدعم",
    });
    return;
  }
  
  req.userId = decoded.userId;
  req.restaurantId = ctx.restaurant_id;
  req.roles = ctx.roles;

  next();
};

export default verifyJWT;