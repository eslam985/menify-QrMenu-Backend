import pool from "#src/config/dbConn.js";
import type { PoolClient } from "pg";
import { CustomError } from "#src/utils/customErr.js";
import { MAX_ACTIVE_OFFERS } from "#src/config/constants.js";
import type {
  OfferResponse,
  OfferStatus,
  OfferItemInput,
  CreateOfferInput,
  UpdateOfferInput,
  SetOfferImageResult,
} from "#src/types/dataType/offerType.js";

// Only these keys can reach the SET clause (the keys are interpolated into SQL)
const UPDATABLE_COLUMNS = ["title", "description", "offer_price", "starts_at", "ends_at", "is_active"] as const;

const ITEM_NOT_FOUND = "One or more menu items were not found";

/**
 * Prices are read LIVE from menu_items, so original_total/savings never go stale.
 * original_total is NULL when the offer has a free text line or no items.
 */
const baseSelect = (joinSql: string, whereSql: string): string => `
  SELECT o.id, o.title, o.description, o.image_url, o.offer_price::float8 AS offer_price,
         o.starts_at, o.ends_at, o.is_active, o.created_at, o.updated_at,
         CASE WHEN NOT o.is_active THEN 'paused'
              WHEN o.ends_at <= now() THEN 'expired'
              WHEN o.starts_at > now() THEN 'upcoming'
              ELSE 'active' END AS status,
         COALESCE(i.items, '[]'::json) AS items,
         i.original_total,
         COALESCE(i.all_available, true) AS all_items_available
  FROM offers o
  ${joinSql}
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object(
             'id', oi.id,
             'menu_item_id', oi.menu_item_id,
             'title', m.title,
             'custom_label', oi.custom_label,
             'quantity', oi.quantity,
             'unit_price', m.price::float8,
             'image_url', m.image_url,
             'is_available', COALESCE(m.is_available, true)
           ) ORDER BY oi.display_order, oi.id) AS items,
           CASE WHEN count(*) > 0 AND bool_and(oi.menu_item_id IS NOT NULL)
                THEN sum(m.price * oi.quantity)::float8 END AS original_total,
           bool_and(oi.menu_item_id IS NULL OR m.is_available) AS all_available
    FROM offer_items oi
    LEFT JOIN menu_items m ON m.id = oi.menu_item_id AND m.restaurant_id = oi.restaurant_id
    WHERE oi.offer_id = o.id
  ) i ON true
  WHERE ${whereSql}`;

const round2 = (n: number): number => Math.round(n * 100) / 100;

const mapRow = (r: any): OfferResponse => {
  const total: number | null = r.original_total === null ? null : round2(r.original_total);
  const savings = total !== null && r.offer_price !== null ? round2(total - r.offer_price) : null;
  return { ...r, original_total: total, savings };
};

/** One INSERT for all lines. A NULL menu_item_id skips the composite FK (free text line). */
const insertItems = async (
  db: PoolClient,
  offerId: string,
  restaurantId: string,
  items: OfferItemInput[],
): Promise<void> => {
  if (items.length === 0) return;
  await db.query(
    `INSERT INTO offer_items (offer_id, restaurant_id, menu_item_id, custom_label, quantity, display_order)
     SELECT $1, $2, t.mid, t.label, t.qty, t.ord - 1
     FROM unnest($3::uuid[], $4::text[], $5::int[]) WITH ORDINALITY AS t(mid, label, qty, ord)`,
    [
      offerId,
      restaurantId,
      items.map((i) => ("menu_item_id" in i ? i.menu_item_id : null)),
      items.map((i) => ("custom_label" in i ? i.custom_label : null)),
      items.map((i) => i.quantity),
    ],
  );
};

/** Runs inside the transaction AFTER the write: more than the limit => the caller rolls back */
const assertActiveLimit = async (db: PoolClient, restaurantId: string): Promise<void> => {
  const r = await db.query(
    `SELECT count(*)::int AS n FROM offers
     WHERE restaurant_id = $1 AND is_active AND ends_at > now()`,
    [restaurantId],
  );
  if (r.rows[0].n > MAX_ACTIVE_OFFERS) {
    throw new CustomError(
      `You can have at most ${MAX_ACTIVE_OFFERS} active offers at the same time`,
      409,
    );
  }
};

const mapPgError = (err: any): never => {
  // composite FK (menu_item_id, restaurant_id): unknown item OR an item of another restaurant
  if (err.code === "23503") throw new CustomError(ITEM_NOT_FOUND, 404);
  throw err;
};

const Offer = {
  async findAll(restaurantId: string, status?: OfferStatus): Promise<OfferResponse[]> {
    const result = await pool.query(
      `SELECT * FROM (${baseSelect("", "o.restaurant_id = $1")}) t
       WHERE ($2::text IS NULL OR t.status = $2)
       ORDER BY CASE t.status WHEN 'active' THEN 0 WHEN 'upcoming' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
                t.ends_at`,
      [restaurantId, status ?? null],
    );
    return result.rows.map(mapRow);
  },

  async findById(id: string, restaurantId: string): Promise<OfferResponse | null> {
    const result = await pool.query(baseSelect("", "o.id = $1 AND o.restaurant_id = $2"), [id, restaurantId]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  /** Public menu: only offers that are live RIGHT NOW, of an active restaurant */
  async findLiveBySlug(slug: string): Promise<OfferResponse[]> {
    const result = await pool.query(
      `SELECT * FROM (${baseSelect(
        "JOIN restaurants r ON r.id = o.restaurant_id",
        `r.slug = $1 AND r.status = 'active'
         AND (r.subscription_ends_at IS NULL OR r.subscription_ends_at > now())`,
      )}) t
       WHERE t.status = 'active'
       ORDER BY t.ends_at`,
      [slug],
    );
    return result.rows.map(mapRow);
  },

  async create(input: CreateOfferInput): Promise<OfferResponse> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const r = await client.query(
        `INSERT INTO offers (restaurant_id, title, description, offer_price, starts_at, ends_at, is_active)
         VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()), $6, COALESCE($7::boolean, true))
         RETURNING id`,
        [
          input.restaurantId,
          input.title,
          input.description ?? null,
          input.offerPrice ?? null,
          input.startsAt ?? null,
          input.endsAt,
          input.isActive ?? null,
        ],
      );
      const id: string = r.rows[0].id;

      await insertItems(client, id, input.restaurantId, input.items ?? []);
      await assertActiveLimit(client, input.restaurantId);
      await client.query("COMMIT");

      return (await Offer.findById(id, input.restaurantId))!;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      return mapPgError(err);
    } finally {
      client.release();
    }
  },

  /** "items", when present, REPLACES the whole list. Returns null if the offer isn't this restaurant's. */
  async update(id: string, restaurantId: string, data: UpdateOfferInput): Promise<OfferResponse | null> {
    const entries = Object.entries(data).filter(
      ([k, v]) => v !== undefined && (UPDATABLE_COLUMNS as readonly string[]).includes(k),
    );
    if (entries.length === 0 && data.items === undefined) {
      throw new CustomError("No valid data provided!", 400);
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const lock = await client.query(
        `SELECT id FROM offers WHERE id = $1 AND restaurant_id = $2 FOR UPDATE`,
        [id, restaurantId],
      );
      if (lock.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      // when only items change we still touch the row so the trigger refreshes updated_at
      const setter = entries.length
        ? entries.map(([k], i) => `${k} = $${i + 3}`).join(", ")
        : "title = title";
      await client.query(
        `UPDATE offers SET ${setter} WHERE id = $1 AND restaurant_id = $2`,
        [id, restaurantId, ...entries.map(([, v]) => v)],
      );

      if (data.items !== undefined) {
        await client.query(`DELETE FROM offer_items WHERE offer_id = $1`, [id]);
        await insertItems(client, id, restaurantId, data.items);
      }

      await assertActiveLimit(client, restaurantId);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      return mapPgError(err);
    } finally {
      client.release();
    }

    return Offer.findById(id, restaurantId);
  },

  /** imageUrl = null clears it. Returns the PREVIOUS url so it can be deleted from the cloud. */
  async setImage(id: string, restaurantId: string, imageUrl: string | null): Promise<SetOfferImageResult | null> {
    const result = await pool.query(
      `WITH old AS (SELECT image_url FROM offers WHERE id = $1 AND restaurant_id = $2)
       UPDATE offers SET image_url = $3
       WHERE id = $1 AND restaurant_id = $2
       RETURNING (SELECT image_url FROM old) AS previous_image_url`,
      [id, restaurantId, imageUrl],
    );
    if (!result.rows[0]) return null;

    const offer = await Offer.findById(id, restaurantId);
    return offer ? { offer, previousImageUrl: result.rows[0].previous_image_url ?? null } : null;
  },

  /** Its lines go with it (ON DELETE CASCADE). Returns the image url for the cloud cleanup. */
  async remove(id: string, restaurantId: string): Promise<{ id: string; image_url: string | null } | null> {
    const result = await pool.query(
      `DELETE FROM offers WHERE id = $1 AND restaurant_id = $2 RETURNING id, image_url`,
      [id, restaurantId],
    );
    return result.rows[0] || null;
  },
};

export default Offer;