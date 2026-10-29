import type { RequestHandler } from "express";

import PublicMenu from "#src/service/data/publicMenuService.js";
import { CustomError } from "#src/utils/customErr.js";
import { getParams } from "#src/utils/requestAuth.js";
import type { PublicMenuParamsType } from "#src/middleware/schemas/publicMenuSchema/publicMenuSchema.js";

const handleGetPublicMenu: RequestHandler = async (_req, res, next) => {
  try {
    const { slug } = getParams<PublicMenuParamsType["params"]>(res);

    const menu = await PublicMenu.findBySlug(slug);
    if (!menu) throw new CustomError("Menu not found", 404);

    // Browser: 60s. Vercel CDN (s-maxage): 5 min, and serves stale for 10 min while revalidating.
    // The CDN absorbs the traffic, so the DB is hit about once per 5 min per restaurant.
    res.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");

    res.status(200).json({ success: true, data: menu });
  } catch (err) {
    next(err);
  }
};

export { handleGetPublicMenu };