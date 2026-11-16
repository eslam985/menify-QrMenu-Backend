import { Response } from "express";
import { Request } from "express";
import { importMenuBulkService } from "#src/service/data/menuBulkService.js";
import { CustomError } from "#src/utils/customErr.js";

export async function importMenuBulk(
  req: Request,
  res: Response,
): Promise<void> {
  const paramId = req.params.restaurantId;
  const restaurantId = typeof paramId === "string" ? paramId : paramId?.[0];
  const menuData = req.body.menu;

  if (!restaurantId)
    throw new CustomError(`restaurantId Can Not Be: ${restaurantId}`, 400);

  if (!Array.isArray(menuData) || menuData.length === 0)
    throw new CustomError("بيانات المنيو غير صالحة أو فارغة", 400);

  const result = await importMenuBulkService(restaurantId, menuData);
  
  res.status(200).json({
    message: "تم استيراد المنيو بنجاح",
    ...result,
  });
}

