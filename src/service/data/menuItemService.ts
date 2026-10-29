import pool from "#src/config/dbConn.js";
import { CustomError } from "#src/utils/customErr.js";
import type {
  MenuItemResponse,
  CreateMenuItemInput,
  UpdateMenuItemInput,
  ListMenuItemsFilter,
  DeleteMenuItemResult,
  SetImageResult,
} from "#src/types/dataType/menuItemType.js";

// price is NUMERIC: pg returns it as a string, so it is cast to float8 (a JS number)
const COLUMNS = `id, category_id, title, description, price::float8 AS price,
  image_url, is_available, display_order, created_at, updated_at`;

// Only these keys can reach the SET clause (the keys are interpolated into SQL)
const UPDATABLE_COLUMNS = ["category_id", "title", "description", "price", "is_available"] as const;

const TITLE_CONFLICT = "An item with this title already exists in this category";

// Every query has `restaurant_id = $x`: an item of another tenant behaves as "not found".
const MenuItem = {
  /** Dashboard list, ordered like the real menu: category order, then item order */
  async findAll(restaurantId: string, filter: ListMenuItemsFilter = {}): Promise<MenuItemResponse[]> {
    const result = await pool.query(
      `SELECT m.id, m.category_id, m.title, m.description, m.price::float8 AS price,
              m.image_url, m.is_available, m.display_order, m.created_at, m.updated_at
       FROM menu_items m
       JOIN categories c ON c.id = m.category_id AND c.restaurant_id = m.restaurant_id
       WHERE m.restaurant_id = $1
         AND ($2::uuid IS NULL OR m.category_id = $2)
         AND ($3::boolean IS NULL OR m.is_available = $3)
       ORDER BY c.display_order, c.created_at, m.display_order, m.created_at`,
      [restaurantId, filter.categoryId ?? null, filter.isAvailable ?? null],
    );
    return result.rows;
  },

  async findById(id: string, restaurantId: string): Promise<MenuItemResponse | null> {
    const result = await pool.query(
      `SELECT ${COLUMNS} FROM menu_items WHERE id = $1 AND restaurant_id = $2`,
      [id, restaurantId],
    );
    return result.rows[0] || null;
  },

  /**
   * Appended at the end of its category.
   * INSERT ... SELECT FROM categories: if the category isn't this restaurant's, zero rows
   * are inserted and we return null (-> 404).
   */
  async create(input: CreateMenuItemInput): Promise<MenuItemResponse | null> {
    try {
      const result = await pool.query(
        `INSERT INTO menu_items
           (restaurant_id, category_id, title, description, price, is_available, display_order)
         SELECT c.restaurant_id, c.id, $3::text, $4::text, $5::numeric, COALESCE($6::boolean, true),
                (SELECT COALESCE(MAX(display_order) + 1, 0) FROM menu_items WHERE category_id = c.id)
         FROM categories c
         WHERE c.id = $2 AND c.restaurant_id = $1
         RETURNING ${COLUMNS}`,
        [
          input.restaurantId,
          input.categoryId,
          input.title,
          input.description ?? null,
          input.price,
          input.isAvailable ?? null,
        ],
      );
      return result.rows[0] || null;
    } catch (err: any) {
      if (err.code === "23505") throw new CustomError(TITLE_CONFLICT, 409);
      throw err;
    }
  },

  /** Changing category_id moves the item to the END of the new category */
  async update(
    id: string,
    restaurantId: string,
    data: UpdateMenuItemInput,
  ): Promise<MenuItemResponse | null> {
    const entries = Object.entries(data).filter(
      ([k, v]) => v !== undefined && (UPDATABLE_COLUMNS as readonly string[]).includes(k),
    );
    if (entries.length === 0) throw new CustomError("No valid data provided!", 400);

    const setParts = entries.map(([k], i) => `${k} = $${i + 3}`);
    const values = entries.map(([, v]) => v);

    const catIdx = entries.findIndex(([k]) => k === "category_id");
    if (catIdx !== -1) {
      const p = `$${catIdx + 3}`;
      // In SET, column references read the OLD row: same category => keep the order
      setParts.push(
        `display_order = CASE WHEN category_id = ${p}::uuid THEN display_order
           ELSE (SELECT COALESCE(MAX(display_order) + 1, 0) FROM menu_items WHERE category_id = ${p}::uuid)
         END`,
      );
    }

    try {
      const result = await pool.query(
        `UPDATE menu_items SET ${setParts.join(", ")}
         WHERE id = $1 AND restaurant_id = $2
         RETURNING ${COLUMNS}`,
        [id, restaurantId, ...values],
      ); // updated_at is handled by the trigger
      return result.rows[0] || null;
    } catch (err: any) {
      if (err.code === "23505") throw new CustomError(TITLE_CONFLICT, 409);
      // composite FK (category_id, restaurant_id): the target category isn't this restaurant's
      if (err.code === "23503") throw new CustomError("Category not found", 404);
      throw err;
    }
  },

  async setAvailability(
    id: string,
    restaurantId: string,
    isAvailable: boolean,
  ): Promise<MenuItemResponse | null> {
    const result = await pool.query(
      `UPDATE menu_items SET is_available = $3
       WHERE id = $1 AND restaurant_id = $2
       RETURNING ${COLUMNS}`,
      [id, restaurantId, isAvailable],
    );
    return result.rows[0] || null;
  },

  /** imageUrl = null clears the image. Returns the PREVIOUS url so it can be deleted from the cloud. */
  async setImage(
    id: string,
    restaurantId: string,
    imageUrl: string | null,
  ): Promise<SetImageResult | null> {
    const result = await pool.query(
      `WITH old AS (
         SELECT image_url FROM menu_items WHERE id = $1 AND restaurant_id = $2
       )
       UPDATE menu_items SET image_url = $3
       WHERE id = $1 AND restaurant_id = $2
       RETURNING ${COLUMNS}, (SELECT image_url FROM old) AS previous_image_url`,
      [id, restaurantId, imageUrl],
    );
    const row = result.rows[0];
    if (!row) return null;

    const { previous_image_url, ...item } = row;
    return { item, previousImageUrl: previous_image_url ?? null };
  },

  async remove(id: string, restaurantId: string): Promise<DeleteMenuItemResult | null> {
    const result = await pool.query(
      `DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2 RETURNING id, image_url`,
      [id, restaurantId],
    );
    return result.rows[0] || null;
  },

  /** Called BEFORE deleting a category: CASCADE removes the rows, so we must collect the images first */
  async findImageUrlsByCategory(categoryId: string, restaurantId: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT image_url FROM menu_items
       WHERE category_id = $1 AND restaurant_id = $2 AND image_url IS NOT NULL`,
      [categoryId, restaurantId],
    );
    return result.rows.map((r) => r.image_url as string);
  },

  /**
   * Reorders the items of ONE category: ids[0] -> 0, ids[1] -> 1, ...
   * If any id isn't an item of this restaurant AND this category, nothing changes (404).
   */
  async reorder(restaurantId: string, categoryId: string, ids: string[]): Promise<MenuItemResponse[]> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `UPDATE menu_items m
         SET display_order = t.ord - 1
         FROM unnest($1::uuid[]) WITH ORDINALITY AS t(id, ord)
         WHERE m.id = t.id AND m.restaurant_id = $2 AND m.category_id = $3`,
        [ids, restaurantId, categoryId],
      );

      if (result.rowCount !== ids.length) {
        throw new CustomError("One or more menu items were not found in this category", 404);
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }

    return MenuItem.findAll(restaurantId, { categoryId });
  },
};

export default MenuItem;