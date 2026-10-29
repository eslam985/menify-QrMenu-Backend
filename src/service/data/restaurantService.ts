import pool from "#src/config/dbConn.js";
import type { RestaurantResponse, SetLogoResult } from "#src/types/dataType/restaurantType.js";

const COLUMNS = `id, name, slug, logo_url, created_at`;

// The id always comes from req.restaurantId, so a user can only ever touch his own restaurant
const Restaurant = {
  async findById(id: string): Promise<RestaurantResponse | null> {
    const result = await pool.query(`SELECT ${COLUMNS} FROM restaurants WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },

  async updateName(id: string, name: string): Promise<RestaurantResponse | null> {
    const result = await pool.query(
      `UPDATE restaurants SET name = $2 WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, name],
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