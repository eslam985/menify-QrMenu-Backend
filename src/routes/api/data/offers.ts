import express from "express";
const router = express.Router();

import { validateRequest, validateFile } from "#src/middleware/validation.js";
import verifyRoles from "#src/middleware/verifyRoles.js";
import upload from "#src/middleware/uploadMiddleware.js";
import ROLES_LIST from "#src/config/roles_list.js";
import { menuImageLimiter } from "#src/config/rateLimiter.js";
import { uploadAvatarSchema } from "#src/middleware/schemas/userSchema/avatarSchema.js";
import {
  listOffersSchema,
  createOfferSchema,
  updateOfferSchema,
  offerIdSchema,
} from "#src/middleware/schemas/offerSchema/offerSchema.js";
import {
  handleGetOffers,
  handleGetOfferById,
  handleCreateOffer,
  handleUpdateOffer,
  handleUploadOfferImage,
  handleDeleteOfferImage,
  handleDeleteOffer,
} from "#src/controllers/data/offerController.js";

// verifyJWT is applied in server.ts. Reading: any logged-in user. Writing: Editor and above.
const editorUp = verifyRoles(ROLES_LIST.Editor);

router.get("/", validateRequest(listOffersSchema), handleGetOffers);
router.post("/", editorUp, validateRequest(createOfferSchema), handleCreateOffer);

router.get("/:offerId", validateRequest(offerIdSchema), handleGetOfferById);
router.patch("/:offerId", editorUp, validateRequest(updateOfferSchema), handleUpdateOffer);
router.delete("/:offerId", editorUp, validateRequest(offerIdSchema), handleDeleteOffer);

router.post(
  "/:offerId/image",
  editorUp,
  menuImageLimiter,
  validateRequest(offerIdSchema),
  upload.single("image"),
  validateFile(uploadAvatarSchema),
  handleUploadOfferImage,
);
router.delete("/:offerId/image", editorUp, validateRequest(offerIdSchema), handleDeleteOfferImage);

export default router;