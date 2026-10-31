import type { RequestHandler } from "express";

import Category from "#src/service/data/categoryService.js";
import { CustomError } from "#src/utils/customErr.js";
import { getRestaurantId, getParams } from "#src/utils/requestAuth.js";
import type {
  CreateCategoryType,
  UpdateCategoryType,
  CategoryIdType,
  ReorderCategoriesType,
} from "#src/middleware/schemas/categorySchema/categorySchema.js";

import MenuItem from "#src/service/data/menuItemService.js";
import { getPublicIdFromUrl, safeDestroy, tenantPrefix } from "#src/utils/cloudinaryHelpers.js";

const handleGetCategories: RequestHandler = async (req, res, next) => {
  try {
    const data = await Category.findAll(getRestaurantId(req));

    res.status(200).json({
      success: true,
      message: `We found ${data.length} categories`,
      data,
    });
  } catch (err) {
    next(err);
  }
};

const handleGetCategoryById: RequestHandler = async (req, res, next) => {
  try {
    const { categoryId } = getParams<CategoryIdType["params"]>(res);

    const category = await Category.findById(categoryId, getRestaurantId(req));
    if (!category) throw new CustomError("Category not found", 404);

    res.status(200).json({ success: true, message: "Category found", data: category });
  } catch (err) {
    next(err);
  }
};

const handleCreateCategory: RequestHandler = async (req, res, next) => {
  try {
    const { name, section, display_order } = req.body as CreateCategoryType["body"];

    const category = await Category.create({
      restaurantId: getRestaurantId(req),
      name,
      section,
      displayOrder: display_order,
    });
    res.status(201).json({ success: true, message: "Category created", data: category });
  } catch (err) {
    next(err);
  }
};

const handleUpdateCategory: RequestHandler = async (req, res, next) => {
  try {
    const { categoryId } = getParams<UpdateCategoryType["params"]>(res);
    const body = req.body as UpdateCategoryType["body"];

    const category = await Category.update(categoryId, getRestaurantId(req), body);
    if (!category) throw new CustomError("Category not found", 404);

    res.status(200).json({ success: true, message: "Category updated", data: category });
  } catch (err) {
    next(err);
  }
};


const handleDeleteCategory: RequestHandler = async (req, res, next) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { categoryId } = getParams<CategoryIdType["params"]>(res);

    // Collect first: after the CASCADE the rows (and their image urls) are gone
    const imageUrls = await MenuItem.findImageUrlsByCategory(categoryId, restaurantId);

    const result = await Category.remove(categoryId, restaurantId);
    if (!result) throw new CustomError("Category not found", 404);

    // Best-effort cleanup (safeDestroy never throws)
    await Promise.all(
      imageUrls.map((u) => safeDestroy(getPublicIdFromUrl(u), tenantPrefix(restaurantId))),
    );

    res.status(200).json({
      success: true,
      message:
        result.deleted_items > 0
          ? `Category deleted along with ${result.deleted_items} menu item(s)`
          : "Category deleted",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const handleReorderCategories: RequestHandler = async (req, res, next) => {
  try {
    const { ids } = req.body as ReorderCategoriesType["body"];

    const data = await Category.reorder(getRestaurantId(req), ids);

    res.status(200).json({ success: true, message: "Categories reordered", data });
  } catch (err) {
    next(err);
  }
};

export {
  handleGetCategories,
  handleGetCategoryById,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeleteCategory,
  handleReorderCategories,
};