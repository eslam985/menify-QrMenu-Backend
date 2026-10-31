/** Category as returned to the client (restaurant_id is intentionally not exposed) */
export type CategorySection = "food" | "drinks" | "desserts" | "other";

export interface CategoryResponse {
  id: string;
  name: string;
  section: CategorySection;  
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  restaurantId: string;
  name: string;
  section: CategorySection;   // new (the schema default guarantees it)
  displayOrder?: number | undefined;
}

export interface UpdateCategoryInput {
  name?: string | undefined;
  section?: CategorySection | undefined; 
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