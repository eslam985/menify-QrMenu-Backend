export type DayHours = { open: string; close: string } | null;

export interface WorkingHours {
  sat: DayHours; sun: DayHours; mon: DayHours; tue: DayHours;
  wed: DayHours; thu: DayHours; fri: DayHours;
}

export interface RestaurantResponse {
  id: string;
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
  status: string;                       // read-only: the dashboard shows a warning when suspended
  subscription_ends_at: string | null;  // read-only
  created_at: string;
}

/** Input of Restaurant.update. Only keys that are present are updated. */
export interface UpdateRestaurantInput {
  name?: string | undefined;
  description?: string | null | undefined;
  phone?: string | null | undefined;
  whatsapp?: string | null | undefined;
  address?: string | null | undefined;
  maps_url?: string | null | undefined;
  instagram_url?: string | null | undefined;
  facebook_url?: string | null | undefined;
  currency?: string | undefined;
  timezone?: string | undefined;
  working_hours?: WorkingHours | null | undefined;
}

export interface SetLogoResult {
  restaurant: RestaurantResponse;
  previousLogoUrl: string | null;
}