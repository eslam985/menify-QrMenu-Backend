import type { RequestHandler } from "express";

import PublicMenu from "#src/service/data/publicMenuService.js";
import { CustomError } from "#src/utils/customErr.js";
import { getParams } from "#src/utils/requestAuth.js";
import type { PublicMenuResponse } from "#src/types/dataType/publicMenuType.js";
import type { PublicMenuParamsType } from "#src/middleware/schemas/publicMenuSchema/publicMenuSchema.js";

// Per-instance micro cache: protects the DB from stampedes and from random-slug scans.
// null (unknown slug) is cached too. Errors are NOT cached.
const TTL_MS = 15_000;
const MAX_ENTRIES = 500;

const cache = new Map<string, { expires: number; value: PublicMenuResponse | null }>();
const inflight = new Map<string, Promise<PublicMenuResponse | null>>();

const getMenu = (slug: string): Promise<PublicMenuResponse | null> => {
  const hit = cache.get(slug);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value);

  let pending = inflight.get(slug);
  if (!pending) {
    pending = PublicMenu.findBySlug(slug)
      .then((value) => {
        if (cache.size >= MAX_ENTRIES) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
        cache.delete(slug);
        cache.set(slug, { expires: Date.now() + TTL_MS, value });
        return value;
      })
      .finally(() => inflight.delete(slug));
    inflight.set(slug, pending);
  }
  return pending;
};

const handleGetPublicMenu: RequestHandler = async (_req, res, next) => {
  try {
    const { slug } = getParams<PublicMenuParamsType["params"]>(res);

    const menu = await getMenu(slug);

    if (!menu) {
      // Short cache for 404s too, otherwise "/menu/undefined" hits the DB every time
      res.set("Cache-Control", "public, max-age=30, s-maxage=60");
      throw new CustomError("Menu not found", 404);
    }

    res.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ success: true, message: 'success', data: menu });
  } catch (err) {
    next(err);
  }
};

export { handleGetPublicMenu };