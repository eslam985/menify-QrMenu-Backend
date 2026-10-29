import type { RequestHandler } from "express";

import AvatarService from "#src/service/user/avatarService.js";
import { DEFAULT_AVATAR } from "#src/config/constants.js";
import { CustomError } from "#src/utils/customErr.js";
import { getUserId, getRestaurantId } from "#src/utils/requestAuth.js";

import type { SetAvatarFromHistoryType } from "#src/middleware/schemas/userSchema/avatarSchema.js";
import {
  getPublicIdFromUrl,
  safeDestroy,
  tenantPrefix,
  uploadImageBuffer,
} from "#src/utils/cloudinaryHelpers.js";
// One folder per tenant: easy cleanup + a safe prefix for deletions
const avatarFolder = (restaurantId: string): string => `${tenantPrefix(restaurantId)}avatars`;


// 1. Upload a new avatar (the current one moves to history)
const handleUploadAvatar: RequestHandler = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const restaurantId = getRestaurantId(req);

    if (!req.file) {
      res.status(400).json({ success: false, message: "لم يتم استقبال أي ملف" });
      return;
    }

    const uploaded = await uploadImageBuffer(req.file.buffer, avatarFolder(restaurantId));

    try {
      const result = await AvatarService.updateAvatarUrl(userId, uploaded.secure_url);
      if (!result) throw new CustomError("User not found!", 404);

      res.status(200).json({
        success: true,
        message: "تم تحديث الصورة الشخصية بنجاح!",
        data: result,
      });
    } catch (err) {
      // DB failed after the upload succeeded: don't leave an orphan on Cloudinary
      await safeDestroy(uploaded.public_id, tenantPrefix(restaurantId));
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

// 2. Delete the current avatar permanently and fall back to the default
const handleDeleteAvatar: RequestHandler = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const restaurantId = getRestaurantId(req);

    const previous = await AvatarService.deleteAvatarUrl(userId);
    if (!previous) throw new CustomError("لا توجد صورة مخصصة لحذفها", 400);

    // The DB is already updated, so a cloud failure here is logged but doesn't fail the request
    await safeDestroy(getPublicIdFromUrl(previous.avatar_url), tenantPrefix(restaurantId));

    res.status(200).json({
      success: true,
      message: "تم مسح الصورة الشخصية والعودة للوضع الافتراضي بنجاح",
      data: { avatar_url: DEFAULT_AVATAR },
    });
  } catch (err) {
    next(err);
  }
};

// 3. Activate a previous avatar from the user's own history
const handleSetAvatarFromHistory: RequestHandler = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { chosenAvatarUrl } = req.body as SetAvatarFromHistoryType["body"];

    // The service throws CustomError(404) if the URL isn't in THIS user's history
    const result = await AvatarService.setAvatarFromHistory(userId, chosenAvatarUrl);

    res.status(200).json({
      success: true,
      message: "تم تبديل وتعيين الصورة الشخصية من السجل بنجاح",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export { handleUploadAvatar, handleDeleteAvatar, handleSetAvatarFromHistory };