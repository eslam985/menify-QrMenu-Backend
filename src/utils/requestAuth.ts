import type { Request } from "express";
import { CustomError } from "#src/utils/customErr.js";
import type { RequestHandler } from "express";

// verifyJWT guarantees these. They narrow the types and fail loudly if a route forgot verifyJWT.
export const getUserId = (req: Request): string => {
  if (!req.userId) throw new CustomError("Unauthorized", 401);
  return req.userId;
};

export const getRestaurantId = (req: Request): string => {
  if (!req.restaurantId) throw new CustomError("Unauthorized", 401);
  return req.restaurantId;
};


// Parsed params come from validateRequest (Express 5: req.params is not reliable for this)
export const getParams = <T>(res: Parameters<RequestHandler>[1]): T =>
  (res.locals.validated as { params: T }).params;