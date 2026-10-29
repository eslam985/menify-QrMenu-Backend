// src/types/express.d.ts
import type { RolesType } from "#src/types/userType/userType.js";

export {};

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      restaurantId?: string;
      roles?: RolesType;
    }
  }
}