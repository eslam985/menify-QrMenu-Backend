import pool from "#src/config/dbConn.js";
import type { Pool, PoolClient } from "pg";

import { SESSION_TTL_MS } from "#src/config/cookieOptions.js";
import { CustomError } from "#src/utils/customErr.js";
import { hashToken } from "#src/utils/hashToken.js";

import type { OrderingType } from "#src/types/globalTypes.js";
import type { UpdateUserByIdType } from "#src/middleware/schemas/userSchema/userSchema.js";
import type {
  UserResponse,
  FindUserByEmailResponse,
  SessionResponse,
  AllowedSessionColumnsType,
  FindUserPasswordWithIdResponse,
  CreateUserInput,
  RegisterRestaurantInput,
  UserProfileResponse,
  AuthContextResponse,
} from "#src/types/userType/userType.js";

const USER_COLUMNS = `
  id, restaurant_id, username, email, avatar_url,
  avatar_history, roles, created_at, updated_at`;

// Only these columns may be updated dynamically (prevents SQL injection via keys)
const UPDATABLE_COLUMNS = ["username", "email"] as const;

type Db = Pool | PoolClient;

const User = {
  // ---------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------
  async createNewUser(
    { restaurantId, username, email, password, roles }: CreateUserInput,
    db: Db = pool,
  ): Promise<UserResponse> {
    const result = await db.query(
      `INSERT INTO users (restaurant_id, username, email, password_hash, roles)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${USER_COLUMNS}`,
      [restaurantId, username, email, password, roles],
    );
    return result.rows[0];
  },

  /** Registers a new tenant: restaurant + its first admin, atomically. */
  async registerRestaurantWithOwner(
    input: RegisterRestaurantInput,
  ): Promise<UserResponse> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Atomic "use once": two requests with the same code can't both succeed
      const invite = await client.query(
        `UPDATE registration_invites SET used_at = now()
        WHERE code_hash = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING id`,
        [hashToken(input.inviteCode)],
      );

      if (invite.rowCount === 0) throw new CustomError("Invalid or expired invite code", 403);

      const r = await client.query(
        `INSERT INTO restaurants (name, slug) VALUES ($1, $2) RETURNING id`,
        [input.restaurantName, input.slug],
      );

      await client.query(
        `UPDATE registration_invites SET used_by_restaurant_id = $1 WHERE id = $2`,
        [r.rows[0].id, invite.rows[0].id],
      );
      
      const user = await User.createNewUser(
        {
          restaurantId: r.rows[0].id,
          username: input.username,
          email: input.email,
          password: input.passwordHash,
          roles: input.roles,
        },
        client,
      );

      await client.query("COMMIT");
      return user;
    } catch (err: any) {
      await client.query("ROLLBACK");
      // 23505 = unique_violation (slug / email / username)
      if (err.code === "23505") {
        if (err.constraint === "restaurants_slug_key")
          throw new CustomError("Slug already taken!", 409);
        if (err.constraint === "users_email_lower_key")
          throw new CustomError("Email already registered!", 409);
        throw new CustomError("Duplicate value!", 409);
      }
      throw err;
    } finally {
      client.release();
    }
  },

  async updateUserById(
  userId: string,
  data: UpdateUserByIdType["body"],
): Promise<UserResponse | null> {
  const entries = Object.entries(data).filter(([k]) =>
    (UPDATABLE_COLUMNS as readonly string[]).includes(k),
  );
  if (entries.length === 0) throw new CustomError("No valid data provided!", 400);

  const setter = entries.map(([k], i) => `${k} = $${i + 2}`).join(", ");
  const values = entries.map(([, v]) => v);

  try {
    const result = await pool.query(
      `UPDATE users SET ${setter} WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      [userId, ...values],
    ); // updated_at is handled by the DB trigger
    return result.rows[0] || null;
  } catch (err: any) {
    if (err.code === "23505") {
      if (err.constraint === "users_email_lower_key")
        throw new CustomError("Email is already in use", 409);
      if (err.constraint === "users_restaurant_username_lower_key")
        throw new CustomError("Username is already taken in your restaurant", 409);
      throw new CustomError("Duplicate value", 409);
    }
    throw err;
  }
},

  async changePassword(
    userId: string,
    newPasswordHash: string,
  ): Promise<number | null> {
    const result = await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [newPasswordHash, userId],
    );
    return result.rowCount;
  },
  async findProfileById(userId: string): Promise<UserProfileResponse | null> {
    const result = await pool.query(
      `SELECT u.id, u.restaurant_id, u.username, u.email, u.avatar_url, u.avatar_history,
            u.roles, u.created_at, u.updated_at,
            r.name AS restaurant_name, r.slug AS restaurant_slug, r.logo_url AS restaurant_logo_url
     FROM users u
     JOIN restaurants r ON r.id = u.restaurant_id
     WHERE u.id = $1`,
      [userId],
    );
    return result.rows[0] || null;
  },
  async findUserById(userId: string): Promise<UserResponse | null> {
    const result = await pool.query(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [userId],
    );
    return result.rows[0] || null;
  },

  async findUserPasswordWithId(
    userId: string,
  ): Promise<FindUserPasswordWithIdResponse | null> {
    // alias keeps controllers unchanged (they still read `.password`)
    const result = await pool.query(
      `SELECT id, password_hash AS password FROM users WHERE id = $1`,
      [userId],
    );
    return result.rows[0] || null;
  },

  async findByEmail(email: string): Promise<FindUserByEmailResponse | null> {
    const result = await pool.query(
      `SELECT ${USER_COLUMNS}, password_hash AS password
       FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    return result.rows[0] || null;
  },

  async findByUsername(
    restaurantId: string,
    username: string,
  ): Promise<UserResponse | null> {
    const result = await pool.query(
      `SELECT ${USER_COLUMNS} FROM users
       WHERE restaurant_id = $1 AND lower(username) = lower($2)`,
      [restaurantId, username],
    );
    return result.rows[0] || null;
  },

  // ---------------------------------------------------------------
  // Sessions
  // ---------------------------------------------------------------
  async createSession(
    userId: string,
    refreshToken: string,
    userAgent: string,
    ipAddress: string,
  ): Promise<SessionResponse> {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const result = await pool.query(
      `INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, user_agent, ip_address, expires_at, created_at, updated_at, family_id`,
      [userId, hashToken(refreshToken), userAgent, ipAddress, expiresAt],
    );
    return result.rows[0];
  },

  async getSessionsByUserId(
    userId: string,
    sortBy: keyof AllowedSessionColumnsType = "expires_at",
    sortOrder: OrderingType = "ASC",
  ): Promise<SessionResponse[]> {
    if (!userId) throw new CustomError("User Id Is Required!", 400);

    const allowedColumns: AllowedSessionColumnsType = {
      user_agent: "user_agent",
      ip_address: "ip_address",
      expires_at: "expires_at",
      created_at: "created_at",
      updated_at: "updated_at",
    };
    const orderByColumn = allowedColumns[sortBy] || "expires_at";
    const orderDirection =
      String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

    const result = await pool.query(
      `SELECT id, user_id, user_agent, ip_address, expires_at, created_at, updated_at
       FROM sessions
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
       ORDER BY ${orderByColumn} ${orderDirection}`,
      [userId],
    );
    return result.rows;
  },

  async getAuthContext(userId: string, sid: string): Promise<AuthContextResponse | null> {
    const result = await pool.query(
      `SELECT u.restaurant_id, u.roles,
              (r.status = 'active'
              AND (r.subscription_ends_at IS NULL OR r.subscription_ends_at > now())) AS restaurant_active
      FROM users u
      JOIN restaurants r ON r.id = u.restaurant_id
      WHERE u.id = $1
        AND EXISTS (
          SELECT 1 FROM sessions s
          WHERE s.user_id = u.id AND s.family_id = $2
            AND s.revoked_at IS NULL AND s.expires_at > now()
        )`,
      [userId, sid],
    );
    return result.rows[0] || null;
},
  /** Recommended: rotate the refresh token on every refresh. */
  async rotateSession(
    oldToken: string,
    newToken: string,
    userAgent: string,
    ipAddress: string,
  ): Promise<SessionResponse | null> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const old = await client.query(
        `UPDATE sessions SET revoked_at = now()
         WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
         RETURNING user_id, family_id`,
        [hashToken(oldToken)],
      );
      if (old.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      const created = await client.query(
        `INSERT INTO sessions (user_id, family_id, refresh_token_hash, user_agent, ip_address, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, user_id, user_agent, ip_address, expires_at, created_at, updated_at, family_id`,
        [
          old.rows[0].user_id,
          old.rows[0].family_id,   // keep the same family across rotations
          hashToken(newToken),
          userAgent,
          ipAddress,
          new Date(Date.now() + SESSION_TTL_MS),
        ],
      );

      await client.query("COMMIT");
      return created.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
  /**
   * If a token that was ALREADY revoked (more than 10s ago) is presented again,
   * it was most likely stolen: revoke every active session of that user.
   * The 10s grace window avoids false alarms from two concurrent refresh requests
   * (two tabs, React StrictMode).
   */
  async revokeAllOnTokenReuse(token: string): Promise<number> {
    const result = await pool.query(
      `UPDATE sessions SET revoked_at = now()
     WHERE revoked_at IS NULL
       AND user_id = (
         SELECT user_id FROM sessions
         WHERE refresh_token_hash = $1
           AND revoked_at < now() - interval '10 seconds'
       )`,
      [hashToken(token)],
    );
    return result.rowCount ?? 0;
  },
  async removeSessionRefreshToken(token: string): Promise<number | null> {
    const result = await pool.query(
      `DELETE FROM sessions WHERE refresh_token_hash = $1`,
      [hashToken(token)],
    );
    return result.rowCount;
  },

  async removeSessionById(
    sessionId:string,
    userId: string,
  ) {
    // userId is required so a user can never delete someone else's session
    const result = await pool.query(
      `DELETE FROM sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId],
    );
    return result.rowCount;
  },

  async removeAllUserSessions(userId: string): Promise<number | null> {
    const result = await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [
      userId,
    ]);
    return result.rowCount;
  },
};

export default User;
