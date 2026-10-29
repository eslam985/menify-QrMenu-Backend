import type { RequestHandler } from "express";

import MenuItem from "#src/service/data/menuItemService.js";
import { CustomError } from "#src/utils/customErr.js";
import { getRestaurantId, getParams } from "#src/utils/requestAuth.js";
import {
  getPublicIdFromUrl,
  safeDestroy,
  tenantPrefix,
  uploadImageBuffer,
} from "#src/utils/cloudinaryHelpers.js";
import type {
  ListMenuItemsType,
  CreateMenuItemType,
  UpdateMenuItemType,
  SetAvailabilityType,
  MenuItemIdType,
  ReorderMenuItemsType,
} from "#src/middleware/schemas/menuItemSchema/menuItemSchema.js";

const NOT_FOUND = "Menu item not found";
const menuFolder = (restaurantId: string): string => `${tenantPrefix(restaurantId)}menu`;

const handleGetMenuItems: RequestHandler = async (req, res, next) => {
  try {
    const { query } = res.locals.validated as ListMenuItemsType;

    const data = await MenuItem.findAll(getRestaurantId(req), {
      categoryId: query.category_id,
      isAvailable: query.is_available,
    });

    res.status(200).json({ success: true, message: `We found ${data.length} menu items`, data });
  } catch (err) {
    next(err);
  }
};

const handleGetMenuItemById: RequestHandler = async (req, res, next) => {
  try {
    const { itemId } = getParams<MenuItemIdType["params"]>(res);

    const item = await MenuItem.findById(itemId, getRestaurantId(req));
    if (!item) throw new CustomError(NOT_FOUND, 404);

    res.status(200).json({ success: true, message: "Menu item found", data: item });
  } catch (err) {
    next(err);
  }
};

const handleCreateMenuItem: RequestHandler = async (req, res, next) => {
  try {
    const b = req.body as CreateMenuItemType["body"];

    const item = await MenuItem.create({
      restaurantId: getRestaurantId(req), // from the DB via verifyJWT, never from the body
      categoryId: b.category_id,
      title: b.title,
      description: b.description,
      price: b.price,
      isAvailable: b.is_available,
    });
    if (!item) throw new CustomError("Category not found", 404);

    res.status(201).json({ success: true, message: "Menu item created", data: item });
  } catch (err) {
    next(err);
  }
};

const handleUpdateMenuItem: RequestHandler = async (req, res, next) => {
  try {
    const { itemId } = getParams<UpdateMenuItemType["params"]>(res);
    const body = req.body as UpdateMenuItemType["body"];

    const item = await MenuItem.update(itemId, getRestaurantId(req), body);
    if (!item) throw new CustomError(NOT_FOUND, 404);

    res.status(200).json({ success: true, message: "Menu item updated", data: item });
  } catch (err) {
    next(err);
  }
};

const handleSetAvailability: RequestHandler = async (req, res, next) => {
  try {
    const { itemId } = getParams<SetAvailabilityType["params"]>(res);
    const { is_available } = req.body as SetAvailabilityType["body"];

    const item = await MenuItem.setAvailability(itemId, getRestaurantId(req), is_available);
    if (!item) throw new CustomError(NOT_FOUND, 404);

    res.status(200).json({
      success: true,
      message: is_available ? "Item is now available" : "Item marked as out of stock",
      data: item,
    });
  } catch (err) {
    next(err);
  }
};

const handleUploadMenuItemImage: RequestHandler = async (req, res, next) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { itemId } = getParams<MenuItemIdType["params"]>(res);

    if (!req.file) {
      res.status(400).json({ success: false, message: "لم يتم استقبال أي ملف" });
      return;
    }

    // Check the item BEFORE uploading: don't spend Cloudinary credits on a missing/foreign item
    const existing = await MenuItem.findById(itemId, restaurantId);
    if (!existing) throw new CustomError(NOT_FOUND, 404);

    const uploaded = await uploadImageBuffer(req.file.buffer, menuFolder(restaurantId), 1200);

    let saved;
    try {
      saved = await MenuItem.setImage(itemId, restaurantId, uploaded.secure_url);
      if (!saved) throw new CustomError(NOT_FOUND, 404); // deleted in between
    } catch (err) {
      await safeDestroy(uploaded.public_id, tenantPrefix(restaurantId)); // no orphan
      throw err;
    }

    // The DB is updated, so a cloud failure here is only logged
    await safeDestroy(getPublicIdFromUrl(saved.previousImageUrl ?? ""), tenantPrefix(restaurantId));

    res.status(200).json({ success: true, message: "Image updated", data: saved.item });
  } catch (err) {
    next(err);
  }
};

const handleDeleteMenuItemImage: RequestHandler = async (req, res, next) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { itemId } = getParams<MenuItemIdType["params"]>(res);

    const saved = await MenuItem.setImage(itemId, restaurantId, null);
    if (!saved) throw new CustomError(NOT_FOUND, 404);
    if (!saved.previousImageUrl) throw new CustomError("This item has no image", 400);

    await safeDestroy(getPublicIdFromUrl(saved.previousImageUrl), tenantPrefix(restaurantId));

    res.status(200).json({ success: true, message: "Image removed", data: saved.item });
  } catch (err) {
    next(err);
  }
};

const handleDeleteMenuItem: RequestHandler = async (req, res, next) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { itemId } = getParams<MenuItemIdType["params"]>(res);

    const deleted = await MenuItem.remove(itemId, restaurantId);
    if (!deleted) throw new CustomError(NOT_FOUND, 404);

    if (deleted.image_url) {
      await safeDestroy(getPublicIdFromUrl(deleted.image_url), tenantPrefix(restaurantId));
    }

    res.status(200).json({ success: true, message: "Menu item deleted", data: { id: deleted.id } });
  } catch (err) {
    next(err);
  }
};

const handleReorderMenuItems: RequestHandler = async (req, res, next) => {
  try {
    const { category_id, ids } = req.body as ReorderMenuItemsType["body"];

    const data = await MenuItem.reorder(getRestaurantId(req), category_id, ids);

    res.status(200).json({ success: true, message: "Menu items reordered", data });
  } catch (err) {
    next(err);
  }
};

export {
  handleGetMenuItems,
  handleGetMenuItemById,
  handleCreateMenuItem,
  handleUpdateMenuItem,
  handleSetAvailability,
  handleUploadMenuItemImage,
  handleDeleteMenuItemImage,
  handleDeleteMenuItem,
  handleReorderMenuItems,
};