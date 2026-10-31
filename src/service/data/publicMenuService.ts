import pool from "#src/config/dbConn.js";
import type { PublicMenuResponse } from "#src/types/dataType/publicMenuType.js";
import Offer from "#src/service/data/offerService.js";

const PublicMenu = {
  /** Returns null when the slug doesn't exist */
  async findBySlug(slug: string): Promise<PublicMenuResponse | null> {
    const result = await pool.query(
      `SELECT
         json_build_object(
          'name', r.name, 'slug', r.slug, 'logo_url', r.logo_url,
          'description', r.description, 'phone', r.phone, 'whatsapp', r.whatsapp,
          'address', r.address, 'maps_url', r.maps_url,
          'instagram_url', r.instagram_url, 'facebook_url', r.facebook_url,
          'currency', r.currency, 'timezone', r.timezone, 'working_hours', r.working_hours
        ) AS restaurant,
         COALESCE((
           SELECT json_agg(cat ORDER BY cat.ord, cat.created)
           FROM (
             SELECT c.display_order AS ord, c.created_at AS created,
                    json_build_object(
                      'id', c.id,
                      'name', c.name,
                      'section', c.section,
                      'items', (
                        SELECT json_agg(
                                 json_build_object(
                                   'id', m.id,
                                   'title', m.title,
                                   'description', m.description,
                                   'price', m.price::float8,
                                   'image_url', m.image_url,
                                   'is_available', m.is_available
                                 ) ORDER BY m.display_order, m.created_at)
                        FROM menu_items m
                        WHERE m.category_id = c.id AND m.restaurant_id = c.restaurant_id
                      )
                    ) AS cat
             FROM categories c
             WHERE c.restaurant_id = r.id
               AND EXISTS (SELECT 1 FROM menu_items m2
                           WHERE m2.category_id = c.id AND m2.restaurant_id = c.restaurant_id)
           ) cat
         ), '[]'::json) AS categories
       FROM restaurants r
       WHERE r.slug = $1
      AND r.status = 'active'
      AND (r.subscription_ends_at IS NULL OR r.subscription_ends_at > now())`,
      [slug],
    );

    const row = result.rows[0];
    
    if (!row) return null;

    // Only reached for an existing, active restaurant
    const live = await Offer.findLiveBySlug(slug);

    // Public shape: no is_active / status / created_at / updated_at
    const offers = live.map(({ is_active, status, created_at, updated_at, ...pub }) => pub);

    return { restaurant: row.restaurant, offers, categories: row.categories };
  },
};

export default PublicMenu;