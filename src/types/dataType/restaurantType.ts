export interface RestaurantResponse {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

export interface SetLogoResult {
  restaurant: RestaurantResponse;
  previousLogoUrl: string | null; // the controller deletes it from Cloudinary
}