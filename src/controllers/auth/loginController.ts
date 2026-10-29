import bcrypt from "bcrypt";
import type { RequestHandler } from "express";

import cookieOptions from "#src/config/cookieOptions.js";
import User from "#src/service/user/userService.js";
import { signAccessToken } from "#src/utils/accessToken.js";
import { generateRefreshToken } from "#src/utils/hashToken.js";
import type { LoginUserType } from "#src/middleware/schemas/userSchema/userSchema.js";

// Compared against when the email doesn't exist, so response time is the same (no user enumeration)
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 12);

const handleLogin: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body as LoginUserType["body"]; // email already trimmed + lowercased by Zod

    const user = await User.findByEmail(email);
    const passwordOk = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

    if (!user || !passwordOk) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    const refreshToken = generateRefreshToken();

    // 1) keep the returned session: its family_id goes into the access token (as "sid")
    const session = await User.createSession(
      user.id,
      refreshToken,
      (req.get("user-agent") ?? "Unknown").slice(0, 512),
      req.ip ?? "Unknown", // requires app.set("trust proxy", 1)
    );

    // 2) the access token is now bound to THIS device's session family
    const accessToken = signAccessToken(user.id, session.family_id);

    // The cookie is set only after the session was saved successfully
    res.cookie("jwt", refreshToken, cookieOptions);

    // Never send the password hash back
    const { password: _omit, ...safeUser } = user;

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { accessToken, userId: user.id, ...safeUser },
    });
  } catch (err) {
    next(err);
  }
};

export default handleLogin;