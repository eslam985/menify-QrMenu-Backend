import bcrypt from "bcrypt";
import type { RequestHandler } from "express";

import User from "#src/service/user/userService.js";
import ROLES_LIST from "#src/config/roles_list.js";
import type { RegisterRestaurantType } from "#src/middleware/schemas/userSchema/userSchema.js";
import type { RolesType } from "#src/types/userType/userType.js";
import { BCRYPT_ROUNDS } from '#src/config/constants.js'


const handleRegister: RequestHandler = async (req, res, next) => {
  try {
    const { inviteCode, restaurantName, slug, username, email, password } =
      req.body as RegisterRestaurantType["body"];

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Restaurant + first Admin in ONE transaction. The role is fixed here, never from the client.
    // Duplicate slug/email => the model maps Postgres 23505 to a 409 CustomError.
    const user = await User.registerRestaurantWithOwner({
      inviteCode,
      restaurantName,
      slug,
      username,
      email,
      passwordHash,
      roles: String(ROLES_LIST.Admin) as RolesType,
    });

    res.status(201).json({
      success: true,
      message: "Restaurant registered successfully",
      data: { user, restaurant: { name: restaurantName, slug } },
    });
  } catch (err) {
    next(err);
  }
};

export default handleRegister;