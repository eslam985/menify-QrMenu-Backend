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
  items: PublicMenuItem[];
}

export interface PublicMenuResponse {
  restaurant: { name: string; slug: string; logo_url: string | null };
  categories: PublicMenuCategory[];
}