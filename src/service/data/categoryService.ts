import pool from "#src/config/dbConn.js";
import { CustomError } from "#src/utils/customErr.js";
import type {
  CategoryResponse,
  CategoryWithCountResponse,
  CreateCategoryInput,
  UpdateCategoryInput,
  DeleteCategoryResult,
} from "#src/types/dataType/categoryType.js";

const COLUMNS = `id, name, display_order, created_at, updated_at`;

// Only these keys can ever reach the SET clause (the keys are interpolated into SQL)
const UPDATABLE_COLUMNS = ["name", "display_order"] as const;

const NAME_CONFLICT = "A category with this name already exists";

// Every query below has `restaurant_id = $x`. A record of another tenant behaves as "not found".
const Category = {
  async findAll(restaurantId: string): Promise<CategoryWithCountResponse[]> {
    const result = await pool.query(
      `SELECT c.id, c.name, c.display_order, c.created_at, c.updated_at,
              count(m.id)::int AS items_count
       FROM categories c
       LEFT JOIN menu_items m
              ON m.category_id = c.id AND m.restaurant_id = c.restaurant_id
       WHERE c.restaurant_id = $1
       GROUP BY c.id
       ORDER BY c.display_order, c.created_at`,
      [restaurantId],
    );
    return result.rows;
  },

  async findById(id: string, restaurantId: string): Promise<CategoryResponse | null> {
    const result = await pool.query(
      `SELECT ${COLUMNS} FROM categories WHERE id = $1 AND restaurant_id = $2`,
      [id, restaurantId],
    );
    return result.rows[0] || null;
  },

  /** display_order omitted => appended after the last category of this restaurant */
  async create({ restaurantId, name, displayOrder }: CreateCategoryInput): Promise<CategoryResponse> {
    try {
      const result = await pool.query(
        `INSERT INTO categories (restaurant_id, name, display_order)
         VALUES (
           $1, $2,
           COALESCE($3::int, (SELECT COALESCE(MAX(display_order) + 1, 0)
                              FROM categories WHERE restaurant_id = $1))
         )
         RETURNING ${COLUMNS}`,
        [restaurantId, name, displayOrder ?? null],
      );
      return result.rows[0];
    } catch (err: any) {
      if (err.code === "23505") throw new CustomError(NAME_CONFLICT, 409);
      throw err;
    }
  },

  async update(
    id: string,
    restaurantId: string,
    data: UpdateCategoryInput,
  ): Promise<CategoryResponse | null> {
    const entries = Object.entries(data).filter(
      ([k, v]) => v !== undefined && (UPDATABLE_COLUMNS as readonly string[]).includes(k),
    );
    if (entries.length === 0) throw new CustomError("No valid data provided!", 400);

    const setter = entries.map(([k], i) => `${k} = $${i + 3}`).join(", ");
    const values = entries.map(([, v]) => v);

    try {
      const result = await pool.query(
        `UPDATE categories SET ${setter}
         WHERE id = $1 AND restaurant_id = $2
         RETURNING ${COLUMNS}`,
        [id, restaurantId, ...values],
      ); // updated_at is handled by the trigger
      return result.rows[0] || null;
    } catch (err: any) {
      if (err.code === "23505") throw new CustomError(NAME_CONFLICT, 409);
      throw err;
    }
  },

  /** Deletes the category AND its items (CASCADE). Returns how many items went with it. */
  async remove(id: string, restaurantId: string): Promise<DeleteCategoryResult | null> {
    const result = await pool.query(
      `WITH cnt AS (
         SELECT count(*)::int AS n
         FROM menu_items WHERE category_id = $1 AND restaurant_id = $2
       ),
       del AS (
         DELETE FROM categories WHERE id = $1 AND restaurant_id = $2 RETURNING id
       )
       SELECT del.id, cnt.n AS deleted_items FROM del, cnt`,
      [id, restaurantId],
    );
    return result.rows[0] || null;
  },

  /**
   * ids[0] -> 0, ids[1] -> 1, ...
   * One UPDATE, inside a transaction: if ANY id doesn't belong to this restaurant,
   * nothing is changed and we answer 404.
   */
  async reorder(restaurantId: string, ids: string[]): Promise<CategoryWithCountResponse[]> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `UPDATE categories c
         SET display_order = t.ord - 1
         FROM unnest($1::uuid[]) WITH ORDINALITY AS t(id, ord)
         WHERE c.id = t.id AND c.restaurant_id = $2`,
        [ids, restaurantId],
      );

      if (result.rowCount !== ids.length) {
        await client.query("ROLLBACK");
        throw new CustomError("One or more categories were not found", 404);
      }

      await client.query("COMMIT");
    } catch (err) {
      // ROLLBACK after a ROLLBACK is a harmless warning
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }

    return Category.findAll(restaurantId);
  },
};

export default Category;