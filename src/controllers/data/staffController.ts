import bcrypt from "bcrypt";
import type { RequestHandler } from "express";

import Staff from "#src/service/data/staffService.js";
import { getRestaurantId, getParams } from "#src/utils/requestAuth.js";
import { getPublicIdFromUrl, safeDestroy, tenantPrefix } from "#src/utils/cloudinaryHelpers.js";
import type {
  CreateStaffType,
  UpdateStaffRoleType,
  StaffIdType,
} from "#src/middleware/schemas/staffSchema/staffSchema.js";

import { BCRYPT_ROUNDS } from '#src/config/constants.js'


const handleGetStaff: RequestHandler = async (req, res, next) => {
  try {
    const data = await Staff.findAll(getRestaurantId(req));

    res.status(200).json({ success: true, message: `We found ${data.length} staff members`, data });
  } catch (err) {
    next(err);
  }
};

const handleCreateStaff: RequestHandler = async (req, res, next) => {
  try {
    const { username, email, password, roles } = req.body as CreateStaffType["body"];

    const staff = await Staff.create({
      restaurantId: getRestaurantId(req), // from the DB via verifyJWT, never from the body
      username,
      email,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      roles,
    });

    res.status(201).json({ success: true, message: "Staff member created", data: staff });
  } catch (err) {
    next(err);
  }
};

const handleUpdateStaffRole: RequestHandler = async (req, res, next) => {
  try {
    const { staffId } = getParams<UpdateStaffRoleType["params"]>(res);
    const { roles } = req.body as UpdateStaffRoleType["body"];

    const staff = await Staff.updateRole(staffId, getRestaurantId(req), roles);

    res.status(200).json({ success: true, message: "Role updated", data: staff });
  } catch (err) {
    next(err);
  }
};

const handleDeleteStaff: RequestHandler = async (req, res, next) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { staffId } = getParams<StaffIdType["params"]>(res);

    const deleted = await Staff.remove(staffId, restaurantId);

    // The DB is done: clean his avatar + history from the cloud (best-effort, never throws).
    // getPublicIdFromUrl returns null for the default avatar, so it is never deleted.
    await Promise.all(
      [deleted.avatar_url, ...deleted.avatar_history].map((u) =>
        safeDestroy(getPublicIdFromUrl(u), tenantPrefix(restaurantId)),
      ),
    );

    res.status(200).json({ success: true, message: "Staff member deleted", data: { id: deleted.id } });
  } catch (err) {
    next(err);
  }
};

export { handleGetStaff, handleCreateStaff, handleUpdateStaffRole, handleDeleteStaff };