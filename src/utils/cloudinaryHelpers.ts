import cloudinary from "#src/config/cloudinary.js";
import type { UploadApiResponse } from "cloudinary";

import { DEFAULT_AVATAR } from "#src/config/constants.js";

/** https://res.cloudinary.com/x/image/upload/v123/folder/name.webp -> folder/name */
export const getPublicIdFromUrl = (url: string): string | null => {
  if (!url || url === DEFAULT_AVATAR) return null;
  try {
    const { pathname } = new URL(url);
    const marker = "/upload/";
    const idx = pathname.indexOf(marker);
    if (idx === -1) return null;

    const publicId = pathname.slice(idx + marker.length).replace(/^v\d+\//, "");
    const dot = publicId.lastIndexOf(".");
    return dot > 0 ? publicId.slice(0, dot) : publicId;
  } catch {
    return null;
  }
};

/**
 * Best-effort delete. NEVER throws (a cloud failure must not fail a request whose DB work succeeded).
 * Only deletes assets under `requiredPrefix` (the tenant's own folder).
 */
export const safeDestroy = async (
  publicId: string | null,
  requiredPrefix: string,
): Promise<void> => {
  if (!publicId || !publicId.startsWith(requiredPrefix)) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (err) {
    console.error("Cloudinary destroy failed:", publicId, err);
  }
};


/** Every asset of a restaurant lives under this folder (also the safe prefix for deletions) */
export const tenantPrefix = (restaurantId: string): string => `restaurants/${restaurantId}/`;

export const uploadImageBuffer = (
  buffer: Buffer,
  folder: string,
  maxSize = 800,
): Promise<UploadApiResponse> =>
  new Promise((resolve, reject) => {
    // 1. إنشاء الـ upload_stream أولاً
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
        format: "avif",
        quality: "auto:good",
        transformation: [{ width: maxSize, height: maxSize, crop: "limit" }],
        timeout: 60000, // 🌟 إضافة مهلة دقيقة كاملة لمنع الـ Timeout المفاجئ بسبب الشبكة
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        
        if (result) {
          // 🌟 2. استنساخ الكائن لتجنب تعديل كائن Cloudinary الأصلي المحمي
          const finalResult = { ...result };

          if (finalResult.secure_url) {
            finalResult.secure_url = finalResult.secure_url.replace(/\.[^/.]+$/, ".avif");
          }
          if (finalResult.url) {
            finalResult.url = finalResult.url.replace(/\.[^/.]+$/, ".avif");
          }
          
          return resolve(finalResult);
        }
        
        return reject(new Error("Cloudinary upload failed with empty result"));
      }
    );

    // 🌟 3. كتابة الـ Buffer وإغلاق الـ Stream بشكل آمن وصحيح 100%
    uploadStream.write(buffer, (err) => {
      if (err) reject(err);
    });
    uploadStream.end();
  });
