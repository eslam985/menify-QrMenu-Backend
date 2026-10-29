// src/service/user/avatarService.ts
import type { SetAndUpdateAvatarUrlResponse } from "#src/types/userType/userType.js";
import { CustomError } from "#src/utils/customErr.js";
import pool from "#src/config/dbConn.js";

// Must match the DEFAULT of users.avatar_url in the DB. Consider moving to src/config/constants.ts
import { DEFAULT_AVATAR } from "#src/config/constants.js";

const RETURNING_COLS = `id, username, avatar_url, avatar_history`;

const AvatarService = {
  // 1. Set a new avatar, push the current one into history (single atomic UPDATE)
  async updateAvatarUrl(
    userId: string,
    newAvatarUrl: string,
  ): Promise<SetAndUpdateAvatarUrlResponse | null> {
    const result = await pool.query(
      `UPDATE users
       SET avatar_history = CASE
             WHEN avatar_url IS NOT NULL
              AND avatar_url <> $1
              AND NOT (avatar_url = ANY (avatar_history))
             THEN array_append(avatar_history, avatar_url)
             ELSE avatar_history
           END,
           avatar_url = $2
       WHERE id = $3
       RETURNING ${RETURNING_COLS}`,
      [DEFAULT_AVATAR, newAvatarUrl, userId],
    );
    return result.rows[0] || null;
  },

  // 2. Reset to default. Returns the PREVIOUS url (to delete it from Cloudinary),
  //    or null when there is nothing to reset (already default / user missing).
  async deleteAvatarUrl(userId: string): Promise<{ avatar_url: string } | null> {
    const result = await pool.query(
      `WITH old AS (SELECT avatar_url FROM users WHERE id = $2)
       UPDATE users
       SET avatar_url = $1
       WHERE id = $2 AND avatar_url IS DISTINCT FROM $1
       RETURNING (SELECT avatar_url FROM old) AS avatar_url`,
      [DEFAULT_AVATAR, userId],
    );
    return result.rows[0] || null;
  },

  // 3. Switch to an avatar from the user's own history
  async setAvatarFromHistory(
    userId: string,
    chosenAvatarUrl: string,
  ): Promise<SetAndUpdateAvatarUrlResponse> {
    const result = await pool.query(
      `UPDATE users
       SET avatar_history = CASE
             WHEN avatar_url IS NOT NULL
              AND avatar_url <> $1
              AND NOT (avatar_url = ANY (avatar_history))
             THEN array_append(array_remove(avatar_history, $2), avatar_url)
             ELSE array_remove(avatar_history, $2)
           END,
           avatar_url = $2
       WHERE id = $3
         AND $2 = ANY (avatar_history)
       RETURNING ${RETURNING_COLS}`,
      [DEFAULT_AVATAR, chosenAvatarUrl, userId],
    );

    if (result.rows.length === 0) {
      throw new CustomError("الصورة المختارة غير موجودة في سجل الصور الخاص بك", 404);
    }
    return result.rows[0];
  },
};

export default AvatarService;