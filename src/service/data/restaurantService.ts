import pool from "#src/config/dbConn.js";

import { CustomError } from "#src/utils/customErr.js";
import type {
  RestaurantResponse,
  SetLogoResult,
  UpdateRestaurantInput,
} from "#src/types/dataType/restaurantType.js";

const COLUMNS = `id, name, slug, logo_url, description, phone, whatsapp, address, maps_url,
  instagram_url, facebook_url, currency, timezone, working_hours,
  status, subscription_ends_at, created_at`;

// Only these keys can reach the SET clause (the keys are interpolated into SQL)
const UPDATABLE_COLUMNS = [
  "name", "description", "phone", "whatsapp", "address", "maps_url",
  "instagram_url", "facebook_url", "currency", "timezone", "working_hours",
] as const;

// The id always comes from req.restaurantId, so a user can only ever touch his own restaurant
const Restaurant = {
  async findById(id: string): Promise<RestaurantResponse | null> {
    const result = await pool.query(`SELECT ${COLUMNS} FROM restaurants WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },

    async update(id: string, data: UpdateRestaurantInput): Promise<RestaurantResponse | null> {
    const entries = Object.entries(data).filter(
      ([k, v]) => v !== undefined && (UPDATABLE_COLUMNS as readonly string[]).includes(k),
    );
    if (entries.length === 0) throw new CustomError("No valid data provided!", 400);

    const setter = entries
      .map(([k, v], i) =>
        // a JS object must go in as a JSON string; a real null stays an SQL NULL
        k === "working_hours" && v !== null ? `${k} = $${i + 2}::jsonb` : `${k} = $${i + 2}`,
      )
      .join(", ");
    const values = entries.map(([k, v]) =>
      k === "working_hours" && v !== null ? JSON.stringify(v) : v,
    );

    const result = await pool.query(
      `UPDATE restaurants SET ${setter} WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, ...values],
    );
    return result.rows[0] || null;
  },

  /** logoUrl = null clears the logo. Returns the PREVIOUS url so it can be deleted from the cloud. */
  async setLogo(id: string, logoUrl: string | null): Promise<SetLogoResult | null> {
    const result = await pool.query(
      `WITH old AS (SELECT logo_url FROM restaurants WHERE id = $1)
       UPDATE restaurants SET logo_url = $2
       WHERE id = $1
       RETURNING ${COLUMNS}, (SELECT logo_url FROM old) AS previous_logo_url`,
      [id, logoUrl],
    );
    const row = result.rows[0];
    if (!row) return null;

    const { previous_logo_url, ...restaurant } = row;
    return { restaurant, previousLogoUrl: previous_logo_url ?? null };
  },
};

export default Restaurant;