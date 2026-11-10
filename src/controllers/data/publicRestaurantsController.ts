import type { RequestHandler } from "express";
import PublicRestaurants from "#src/service/data/publicRestaurantsService.js";

// Simple in-memory cache — refreshes every 60 s
let cache: { expires: number; data: Awaited<ReturnType<typeof PublicRestaurants.findAll>> } | null = null;
const TTL_MS = 60_000;

const handleGetPublicRestaurants: RequestHandler = async (_req, res, next) => {
  try {
    if (!cache || cache.expires <= Date.now()) {
      const data = await PublicRestaurants.findAll();
      cache = { expires: Date.now() + TTL_MS, data };
    }

    res.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ success: true, message: "success", data: cache.data });
  } catch (err) {
    next(err);
  }
};

export { handleGetPublicRestaurants };
