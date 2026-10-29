/** Menu item as returned to the client (restaurant_id is intentionally not exposed) */
export interface MenuItemResponse {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  price: number;            // NUMERIC(10,2) is cast with price::float8 in the SELECT
  image_url: string | null;
  is_available: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** Input of MenuItem.create. restaurantId always comes from req.restaurantId */
export interface CreateMenuItemInput {
  restaurantId: string;
  categoryId: string;
  title: string;
  description?: string | null | undefined;
  price: number;
  isAvailable?: boolean | undefined;
}

/** Input of MenuItem.update (at least one field is guaranteed by the schema) */
export interface UpdateMenuItemInput {
  category_id?: string | undefined;
  title?: string | undefined;
  description?: string | null | undefined;
  price?: number | undefined;
  is_available?: boolean | undefined;
}

/** Optional filters of the dashboard list */
export interface ListMenuItemsFilter {
  categoryId?: string | undefined;
  isAvailable?: boolean | undefined;
}

export interface DeleteMenuItemResult {
  id: string;
  image_url: string | null; // the controller deletes it from Cloudinary after the DB delete
}
export interface SetImageResult {
  item: MenuItemResponse;
  previousImageUrl: string | null; // the controller deletes it from Cloudinary
}