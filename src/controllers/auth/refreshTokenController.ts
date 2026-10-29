import type { RequestHandler } from "express";

import cookieOptions from "#src/config/cookieOptions.js";
import User from "#src/service/user/userService.js";
import { signAccessToken } from "#src/utils/accessToken.js";
import { generateRefreshToken } from "#src/utils/hashToken.js";

const handleRefreshToken: RequestHandler = async (req, res, next) => {
  try {
    const oldToken: string | undefined = req.cookies?.jwt;

    if (!oldToken) {
      res.status(401).json({ success: false, message: "Refresh token is missing" });
      return;
    }

    const newToken = generateRefreshToken();

    // Atomic: revoke the old session + create a new one (rotation)
    const session = await User.rotateSession(
      oldToken,
      newToken,
      (req.get("user-agent") ?? "Unknown").slice(0, 512),
      req.ip ?? "Unknown",
    );

    if (!session) {
      // Unknown / expired / already-used token. If it was a REVOKED token being replayed,
      // kill all of that user's sessions (theft detection).
      await User.revokeAllOnTokenReuse(oldToken);

      // The cookie is intentionally NOT cleared here: with two concurrent refresh calls the
      // loser would wipe the winner's fresh cookie. Logout clears it, and it expires by itself.
      res.status(401).json({ success: false, message: "Invalid or expired session" });
      return;
    }

    res.cookie("jwt", newToken, cookieOptions);

    res.status(200).json({
      success: true,
      message: "Access token updated successfully",
      data: signAccessToken(session.user_id, session.family_id),
    });
  } catch (err) {
    next(err);
  }
};

export default handleRefreshToken;