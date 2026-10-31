import type { RequestHandler } from "express";

import Offer from "#src/service/data/offerService.js";
import { CustomError } from "#src/utils/customErr.js";
import { getRestaurantId, getParams } from "#src/utils/requestAuth.js";
import { getPublicIdFromUrl, safeDestroy, tenantPrefix, uploadImageBuffer } from "#src/utils/cloudinaryHelpers.js";
import type {
  ListOffersType,
  CreateOfferType,
  UpdateOfferType,
  OfferIdType,
} from "#src/middleware/schemas/offerSchema/offerSchema.js";

const NOT_FOUND = "Offer not found";
const offersFolder = (restaurantId: string): string => `${tenantPrefix(restaurantId)}offers`;

const handleGetOffers: RequestHandler = async (req, res, next) => {
  try {
    const { query } = res.locals.validated as ListOffersType;
    const data = await Offer.findAll(getRestaurantId(req), query.status);

    res.status(200).json({ success: true, message: `We found ${data.length} offers`, data });
  } catch (err) {
    next(err);
  }
};

const handleGetOfferById: RequestHandler = async (req, res, next) => {
  try {
    const { offerId } = getParams<OfferIdType["params"]>(res);

    const offer = await Offer.findById(offerId, getRestaurantId(req));
    if (!offer) throw new CustomError(NOT_FOUND, 404);

    res.status(200).json({ success: true, message: "Offer found", data: offer });
  } catch (err) {
    next(err);
  }
};

const handleCreateOffer: RequestHandler = async (req, res, next) => {
  try {
    const b = req.body as CreateOfferType["body"];

    const offer = await Offer.create({
      restaurantId: getRestaurantId(req), // from the DB via verifyJWT, never from the body
      title: b.title,
      description: b.description,
      offerPrice: b.offer_price,
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      isActive: b.is_active,
      items: b.items,
    });

    res.status(201).json({ success: true, message: "Offer created", data: offer });
  } catch (err) {
    next(err);
  }
};

const handleUpdateOffer: RequestHandler = async (req, res, next) => {
  try {
    const { offerId } = getParams<UpdateOfferType["params"]>(res);
    const body = req.body as UpdateOfferType["body"];

    const offer = await Offer.update(offerId, getRestaurantId(req), body);
    if (!offer) throw new CustomError(NOT_FOUND, 404);

    res.status(200).json({ success: true, message: "Offer updated", data: offer });
  } catch (err) {
    next(err);
  }
};

const handleUploadOfferImage: RequestHandler = async (req, res, next) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { offerId } = getParams<OfferIdType["params"]>(res);

    if (!req.file) {
      res.status(400).json({ success: false, message: "لم يتم استقبال أي ملف" });
      return;
    }

    // Check the offer BEFORE uploading: don't spend Cloudinary credits on a missing/foreign offer
    if (!(await Offer.findById(offerId, restaurantId))) throw new CustomError(NOT_FOUND, 404);

    const uploaded = await uploadImageBuffer(req.file.buffer, offersFolder(restaurantId), 1200);

    let saved;
    try {
      saved = await Offer.setImage(offerId, restaurantId, uploaded.secure_url);
      if (!saved) throw new CustomError(NOT_FOUND, 404);
    } catch (err) {
      await safeDestroy(uploaded.public_id, tenantPrefix(restaurantId)); // no orphan
      throw err;
    }

    await safeDestroy(getPublicIdFromUrl(saved.previousImageUrl ?? ""), tenantPrefix(restaurantId));

    res.status(200).json({ success: true, message: "Image updated", data: saved.offer });
  } catch (err) {
    next(err);
  }
};

const handleDeleteOfferImage: RequestHandler = async (req, res, next) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { offerId } = getParams<OfferIdType["params"]>(res);

    const saved = await Offer.setImage(offerId, restaurantId, null);
    if (!saved) throw new CustomError(NOT_FOUND, 404);
    if (!saved.previousImageUrl) throw new CustomError("This offer has no image", 400);

    await safeDestroy(getPublicIdFromUrl(saved.previousImageUrl), tenantPrefix(restaurantId));

    res.status(200).json({ success: true, message: "Image removed", data: saved.offer });
  } catch (err) {
    next(err);
  }
};

const handleDeleteOffer: RequestHandler = async (req, res, next) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { offerId } = getParams<OfferIdType["params"]>(res);

    const deleted = await Offer.remove(offerId, restaurantId);
    if (!deleted) throw new CustomError(NOT_FOUND, 404);

    if (deleted.image_url) {
      await safeDestroy(getPublicIdFromUrl(deleted.image_url), tenantPrefix(restaurantId));
    }

    res.status(200).json({ success: true, message: "Offer deleted", data: { id: deleted.id } });
  } catch (err) {
    next(err);
  }
};

export {
  handleGetOffers,
  handleGetOfferById,
  handleCreateOffer,
  handleUpdateOffer,
  handleUploadOfferImage,
  handleDeleteOfferImage,
  handleDeleteOffer,
};