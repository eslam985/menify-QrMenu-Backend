import { v2 as cloudinary } from "cloudinary";
import { CustomError } from "#src/utils/customErr.js";

import type { ConfigOptions } from "cloudinary";

if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
)
  throw new CustomError("paylodConfigOptions is undefined!", 500);

const paylodConfigOptions: ConfigOptions = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // لضمان استخدام روابط HTTPS
};

cloudinary.config(paylodConfigOptions);

export default cloudinary;
