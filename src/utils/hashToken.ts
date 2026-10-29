import { createHash, randomBytes } from "node:crypto";

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

/** 256-bit random opaque token */
export const generateRefreshToken = (): string =>
  randomBytes(32).toString("base64url");