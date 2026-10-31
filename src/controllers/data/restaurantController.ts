import type { RequestHandler } from "express";

import Restaurant from "#src/service/data/restaurantService.js";
import { CustomError } from "#src/utils/customErr.js";
import { getRestaurantId } from "#src/utils/requestAuth.js";
import {
  getPublicIdFromUrl,
  safeDestroy,
  tenantPrefix,
  uploadImageBuffer,
} from "#src/utils/cloudinaryHelpers.js";
import type { UpdateRestaurantType } from "#src/middleware/schemas/restaurantSchema/restaurantSchema.js";

const NOT_FOUND = "Restaurant not found";
const logoFolder = (restaurantId: string): string => `${tenantPrefix(restaurantId)}logo`;

const handleGetRestaurant: RequestHandler = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(getRestaurantId(req));
    if (!restaurant) throw new CustomError(NOT_FOUND, 404);

    res.status(200).json({ success: true, message: "Restaurant found", data: restaurant });
  } catch (err) {
    next(err);
  }
};

const handleUpdateRestaurant: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as UpdateRestaurantType["body"];

    const restaurant = await Restaurant.update(getRestaurantId(req), body);
    if (!restaurant) throw new CustomError(NOT_FOUND, 404);

    res.status(200).json({ success: true, message: "Restaurant updated", data: restaurant });
  } catch (err) {
    next(err);
  }
};

const handleUploadLogo: RequestHandler = async (req, res, next) => {
  try {
    const restaurantId = getRestaurantId(req);

    if (!req.file) {
      res.status(400).json({ success: false, message: "لم يتم استقبال أي ملف" });
      return;
    }

    const uploaded = await uploadImageBuffer(req.file.buffer, logoFolder(restaurantId), 600);

    let saved;
    try {
      saved = await Restaurant.setLogo(restaurantId, uploaded.secure_url);
      if (!saved) throw new CustomError(NOT_FOUND, 404);
    } catch (err) {
      await safeDestroy(uploaded.public_id, tenantPrefix(restaurantId)); // no orphan
      throw err;
    }

    await safeDestroy(getPublicIdFromUrl(saved.previousLogoUrl ?? ""), tenantPrefix(restaurantId));

    res.status(200).json({ success: true, message: "Logo updated", data: saved.restaurant });
  } catch (err) {
    next(err);
  }
};

const handleDeleteLogo: RequestHandler = async (req, res, next) => {
  try {
    const restaurantId = getRestaurantId(req);

    const saved = await Restaurant.setLogo(restaurantId, null);
    if (!saved) throw new CustomError(NOT_FOUND, 404);
    if (!saved.previousLogoUrl) throw new CustomError("The restaurant has no logo", 400);

    await safeDestroy(getPublicIdFromUrl(saved.previousLogoUrl), tenantPrefix(restaurantId));

    res.status(200).json({ success: true, message: "Logo removed", data: saved.restaurant });
  } catch (err) {
    next(err);
  }
};

export { handleGetRestaurant, handleUpdateRestaurant, handleUploadLogo, handleDeleteLogo };