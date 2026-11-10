import pool from "#src/config/dbConn.js";

export interface PublicRestaurantListItem {
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
}

const PublicRestaurants = {
  /** Returns all active restaurants with a valid subscription */
  async findAll(): Promise<PublicRestaurantListItem[]> {
    const result = await pool.query<PublicRestaurantListItem>(
      `SELECT name, slug, description, logo_url
       FROM restaurants
       WHERE status = 'active'
         AND (subscription_ends_at IS NULL OR subscription_ends_at > now())
       ORDER BY created_at ASC`,
    );
    return result.rows;
  },
};

export default PublicRestaurants;
