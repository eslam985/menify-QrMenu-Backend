import type { RequestHandler } from "express";

import cookieOptions from "#src/config/cookieOptions.js";
import User from "#src/service/user/userService.js";

const handleLogout: RequestHandler = async (req, res, next) => {
  try {
    const token: string | undefined = req.cookies?.jwt;

    // Deleting this device's session is a no-op if the token is unknown
    if (token) await User.removeSessionRefreshToken(token);

    res.clearCookie("jwt", cookieOptions); // same options (path!) as when it was set
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

export default handleLogout;