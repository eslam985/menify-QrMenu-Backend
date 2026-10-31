import type { WorkingHours } from "#src/types/dataType/restaurantType.js";
import type { CategorySection } from "#src/types/dataType/categoryType.js";
import type { OfferItemResponse } from "#src/types/dataType/offerType.js";

export interface PublicMenuItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
}

export interface PublicMenuCategory {
  id: string;
  name: string;
  section: CategorySection; // new
  items: PublicMenuItem[];
}

export interface PublicRestaurantInfo {
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  maps_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  currency: string;
  timezone: string;
  working_hours: WorkingHours | null;
}

export interface PublicOffer {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  offer_price: number | null;
  original_total: number | null;
  savings: number | null;
  starts_at: string;
  ends_at: string;
  all_items_available: boolean;
  items: OfferItemResponse[];
}

export interface PublicMenuResponse {
  restaurant: PublicRestaurantInfo;
  offers: PublicOffer[];            // new: only offers live right now
  categories: PublicMenuCategory[];
}