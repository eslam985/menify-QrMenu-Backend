import pool from "#src/config/dbConn.js";
import { CustomError } from "#src/utils/customErr.js";

interface MenuItemInput {
  title: string;
  price: string | number;
  currency?: string;
}

interface CategoryInput {
  category: string;
  section: string;
  description?: string;
  items: MenuItemInput[];
}

export async function importMenuBulkService(restaurantId: string, menuData: CategoryInput[]) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let totalCategoriesInserted = 0;
    let totalItemsInserted = 0;
    let catIndex = 0;

    for (const cat of menuData) {
      if (!cat) continue;
      
      const catQuery = `
        INSERT INTO categories (id, restaurant_id, name, section, display_order)
        VALUES (gen_random_uuid(), $1, $2, $3, $4)
        ON CONFLICT (restaurant_id, lower(name)) 
        DO UPDATE SET section = EXCLUDED.section, updated_at = NOW()
        RETURNING id;
      `;
      
      const catResult = await client.query(catQuery, [
        restaurantId,
        cat.category.trim(),
        cat.section || "food",
        catIndex
      ]);

      const categoryId = catResult.rows[0].id;
      totalCategoriesInserted++;
      catIndex++;

      // 2. إدخال الأصناف (Menu Items) الخاصة بهذا القسم
      if (cat.items && cat.items.length > 0) {
        for (const [itemIndex, item] of cat.items.entries()) {
          if (!item) continue;
          const priceNum = parseFloat(String(item.price)) || 0;

          const itemQuery = `
            INSERT INTO menu_items (id, restaurant_id, category_id, title, price, display_order, is_available)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true)
            ON CONFLICT (category_id, lower(title)) 
            DO UPDATE SET price = EXCLUDED.price, updated_at = NOW();
          `;

          await client.query(itemQuery, [
            restaurantId,
            categoryId,
            item.title.trim(),
            priceNum,
            itemIndex
          ]);

          totalItemsInserted++;
        }
      }
    }

    await client.query("COMMIT");
    return {
      success: true,
      categoriesProcessed: totalCategoriesInserted,
      itemsProcessed: totalItemsInserted
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    const message = error instanceof Error ? error.message : String(error);
    throw new CustomError(`فشل استيراد المنيو: ${message}`, 500);
  } finally {
    client.release();
  }
}