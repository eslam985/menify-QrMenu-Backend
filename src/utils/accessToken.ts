import jwt from "jsonwebtoken";
import { CustomError } from "#src/utils/customErr.js";

/** The access token carries only the userId. Role and tenant are read from the DB in verifyJWT. */
// src/utils/accessToken.ts
import type { SignOptions } from "jsonwebtoken";

export const signAccessToken = (userId: string, sid: string): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    console.error("ACCESS_TOKEN_SECRET is undefined");
    throw new CustomError("Server configuration error", 500);
  }
  const expiresIn = (process.env.ACCESS_TOKEN_TTL ?? "15m") as NonNullable<SignOptions["expiresIn"]>;
  return jwt.sign({ userId, sid }, secret, { algorithm: "HS256", expiresIn });
};