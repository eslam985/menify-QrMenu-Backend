import bcrypt from "bcrypt";
import type { RequestHandler } from "express";

import cookieOptions from "#src/config/cookieOptions.js";
import { CustomError } from "#src/utils/customErr.js";
import User from "#src/service/user/userService.js";
import { getUserId } from '#src/utils/requestAuth.js'
import type {
  ChangePasswordType,
  UpdateUserByIdType,
  GetSessionsQueryType,
} from "#src/middleware/schemas/userSchema/userSchema.js";
import type { DeleteSessionByIdType } from "#src/middleware/schemas/userSchema/userSchema.js";
import { BCRYPT_ROUNDS } from '#src/config/constants.js'



const handleChangePassword: RequestHandler = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { currentPassword, newPassword } = req.body as ChangePasswordType["body"];

    const row = await User.findUserPasswordWithId(userId);
    if (!row) throw new CustomError("User not found", 404);

    const isMatch = await bcrypt.compare(currentPassword, row.password);
    if (!isMatch) {
      res.status(400).json({ success: false, message: "The current password is incorrect." });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const updated = await User.changePassword(userId, hashed);
    if (!updated) throw new CustomError("An error occurred while changing the password!", 500);

    // Revoke every session on every device, then clear this device's cookie
    await User.removeAllUserSessions(userId);
    res.clearCookie("jwt", cookieOptions);

    res.status(200).json({
      success: true,
      message: "The password has been changed successfully! Please log in again.",
    });
  } catch (err) {
    next(err);
  }
};

const handleUpdateUserInfo: RequestHandler = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const data = req.body as UpdateUserByIdType["body"]; // strict schema: username / email only

    const updated = await User.updateUserById(userId, data);
    if (!updated) throw new CustomError("User not found", 404);

    res.status(200).json({ success: true, message: "User data updated successfully!", data: updated });
  } catch (err) {
    next(err);
  }
};

const handleGetSessionsByUserId: RequestHandler = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { query } = res.locals.validated as GetSessionsQueryType;

    const sessions = await User.getSessionsByUserId(userId, query.sortBy, query.sortOrder);

    res.status(200).json({
      success: true,
      message: `We found ${sessions.length} active sessions!`,
      data: sessions,
    });
  } catch (err) {
    next(err);
  }
};


const handleRemoveSessionById: RequestHandler = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { params } = res.locals.validated as DeleteSessionByIdType;

    const deleted = await User.removeSessionById(params.sessionId, userId);
    if (!deleted) throw new CustomError("Session not found", 404);

    res.status(200).json({ success: true, message: "The session has been successfully deleted!" });
  } catch (err) {
    next(err);
  }
};

const handleFindUserById: RequestHandler = async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const profile = await User.findProfileById(userId);
    if (!profile) throw new CustomError("User not found", 404);

    res.status(200).json({
      success: true,
      message: `Found User ${profile.username} successfully`,
      data: profile,
    });
  } catch (err) {
    next(err);
  }
};

export {
  handleChangePassword,
  handleUpdateUserInfo,
  handleGetSessionsByUserId,
  handleRemoveSessionById,
  handleFindUserById,
};