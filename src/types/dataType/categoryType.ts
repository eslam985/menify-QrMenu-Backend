/** Category as returned to the client (restaurant_id is intentionally not exposed) */
export interface CategoryResponse {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** Input of CategoryService.create. restaurantId always comes from req.restaurantId */
export interface CreateCategoryInput {
  restaurantId: string;
  name: string;
  displayOrder?: number | undefined;
}

/** Input of CategoryService.update (at least one field is guaranteed by the schema) */
export interface UpdateCategoryInput {
  name?: string | undefined;
  display_order?: number | undefined;
}

/** List item: includes how many menu items the category holds (used for the delete confirmation) */
export interface CategoryWithCountResponse extends CategoryResponse {
  items_count: number;
}

export interface DeleteCategoryResult {
  id: string;
  deleted_items: number; // menu items removed by ON DELETE CASCADE
}