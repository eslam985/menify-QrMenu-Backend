import pool from "#src/config/dbConn.js";
import { CustomError } from "#src/utils/customErr.js";
import type { RolesType } from "#src/types/userType/userType.js";
import type {
  StaffResponse,
  CreateStaffInput,
  DeleteStaffResult,
} from "#src/types/dataType/staffType.js";

const ADMIN_ROLE = "5150";

const COLUMNS = `id, username, email, roles, avatar_url, created_at, updated_at`;

// Every query has `restaurant_id = $x`: a user of another tenant behaves as "not found".
const Staff = {
  /** Admin first, then Editors, then Viewers; oldest first inside each group */
  async findAll(restaurantId: string): Promise<StaffResponse[]> {
    const result = await pool.query(
      `SELECT ${COLUMNS} FROM users
       WHERE restaurant_id = $1
       ORDER BY CASE roles WHEN '5150' THEN 0 WHEN '1984' THEN 1 ELSE 2 END, created_at`,
      [restaurantId],
    );
    return result.rows;
  },

  async findById(id: string, restaurantId: string): Promise<StaffResponse | null> {
    const result = await pool.query(
      `SELECT ${COLUMNS} FROM users WHERE id = $1 AND restaurant_id = $2`,
      [id, restaurantId],
    );
    return result.rows[0] || null;
  },

  async create(input: CreateStaffInput): Promise<StaffResponse> {
    try {
      const result = await pool.query(
        `INSERT INTO users (restaurant_id, username, email, password_hash, roles)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${COLUMNS}`,
        [input.restaurantId, input.username, input.email, input.passwordHash, input.roles],
      );
      return result.rows[0];
    } catch (err: any) {
      if (err.code === "23505") {
        if (err.constraint === "users_email_lower_key")
          throw new CustomError("Email is already in use", 409);
        if (err.constraint === "users_restaurant_username_lower_key")
          throw new CustomError("Username is already taken in this restaurant", 409);
        throw new CustomError("Duplicate value", 409);
      }
      throw err;
    }
  },

  /**
   * Changes Editor <-> Viewer. `roles <> '5150'` means an Admin can never be modified.
   * verifyJWT reads the role from the DB on every request, so the change is immediate.
   */
  async updateRole(
    id: string,
    restaurantId: string,
    roles: Exclude<RolesType, "5150">,
  ): Promise<StaffResponse> {
    const result = await pool.query(
      `UPDATE users SET roles = $3
       WHERE id = $1 AND restaurant_id = $2 AND roles <> '${ADMIN_ROLE}'
       RETURNING ${COLUMNS}`,
      [id, restaurantId, roles],
    );
    if (result.rows[0]) return result.rows[0];
    throw await Staff.explainFailure(id, restaurantId);
  },

  /** Sessions go with the user (ON DELETE CASCADE), so he is logged out immediately */
  async remove(id: string, restaurantId: string): Promise<DeleteStaffResult> {
    const result = await pool.query(
      `DELETE FROM users
       WHERE id = $1 AND restaurant_id = $2 AND roles <> '${ADMIN_ROLE}'
       RETURNING id, avatar_url, avatar_history`,
      [id, restaurantId],
    );
    if (result.rows[0]) return result.rows[0];
    throw await Staff.explainFailure(id, restaurantId);
  },

  /** Runs only when an update/delete matched nothing: Admin target (403) or not found (404) */
  async explainFailure(id: string, restaurantId: string): Promise<CustomError> {
    const user = await Staff.findById(id, restaurantId);
    if (user?.roles === ADMIN_ROLE) {
      return new CustomError("The restaurant owner account can't be modified or deleted", 403);
    }
    return new CustomError("Staff member not found", 404);
  },
};

export default Staff;