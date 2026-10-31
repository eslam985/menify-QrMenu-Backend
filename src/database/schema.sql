-- =====================================================================
-- Multi-Tenant Digital QR Menu — PostgreSQL / Supabase schema
-- =====================================================================

-- gen_random_uuid() is built-in since PostgreSQL 13 (no extension needed)

-- ---------------------------------------------------------------------
-- 1. restaurants (tenants)
-- ---------------------------------------------------------------------
CREATE TABLE public.restaurants (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(150) NOT NULL,
    slug        VARCHAR(100) NOT NULL,
    logo_url    TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT restaurants_slug_key    UNIQUE (slug),
    CONSTRAINT restaurants_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- ---------------------------------------------------------------------
-- 2. users (restaurant admins)
-- ---------------------------------------------------------------------
-- =====================================================================
-- Shared trigger function: keeps updated_at fresh on every UPDATE
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- =====================================================================
-- users  (replaces the previous definition)
-- If you already ran the old script, this drops the old table first.
-- =====================================================================
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id    UUID         NOT NULL
                     REFERENCES public.restaurants (id) ON DELETE CASCADE,
    username         VARCHAR(50)  NOT NULL,
    email            VARCHAR(255) NOT NULL,
    password_hash    TEXT         NOT NULL,
    roles character varying(10) not null default '2001'::character varying,
    avatar_url text null default 'https://res.cloudinary.com/dbahqgo8j/image/upload/blogger/iaeclevshfanh5j6x9ew.webp'::text,
    avatar_history   TEXT[]       NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    constraint check_valid_roles check (
      (
        (roles)::text = any (
          (
            array[
              '5150'::character varying,
              '1984'::character varying,
              '2001'::character varying
            ]
          )::text[]
        )
      )
    ) 
);

-- Email: globally unique, case-insensitive (login has no tenant context)
CREATE UNIQUE INDEX users_email_lower_key
    ON public.users (lower(email));

-- Username: unique per restaurant, case-insensitive.
-- Its leading column also serves "list users of a restaurant" queries.
CREATE UNIQUE INDEX users_restaurant_username_lower_key
    ON public.users (restaurant_id, lower(username));

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =====================================================================
-- sessions  (custom refresh-token auth)
-- =====================================================================
CREATE TABLE public.sessions (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID         NOT NULL
                        REFERENCES public.users (id) ON DELETE CASCADE,
    refresh_token_hash  TEXT         NOT NULL,  -- store a hash (e.g. SHA-256), never the raw token
    user_agent          TEXT,
    ip_address          TEXT,
    expires_at          TIMESTAMPTZ  NOT NULL,
    revoked_at          TIMESTAMPTZ,            -- set on logout / token rotation
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Creates the unique index used for token lookups on refresh
    CONSTRAINT sessions_refresh_token_hash_key UNIQUE (refresh_token_hash)
);

-- FK index: list / revoke all sessions of a user, and fast CASCADE on user delete
CREATE INDEX idx_sessions_user_id ON public.sessions (user_id);

-- Cleanup job: DELETE FROM sessions WHERE expires_at < now()
CREATE INDEX idx_sessions_expires_at ON public.sessions (expires_at);

CREATE TRIGGER trg_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();



-- ---------------------------------------------------------------------
-- 3. categories
-- ---------------------------------------------------------------------
CREATE TABLE public.categories (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id  UUID         NOT NULL
                   REFERENCES public.restaurants (id) ON DELETE CASCADE,
    name           VARCHAR(100) NOT NULL,
    display_order  INT          NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Required target for the composite FK from menu_items (tenant-safety)
    CONSTRAINT categories_id_restaurant_key UNIQUE (id, restaurant_id)
);

-- Public menu: list a restaurant's categories in display order
CREATE INDEX idx_categories_restaurant_order
    ON public.categories (restaurant_id, display_order);
-- 1) updated_at (same trigger function we already created)
ALTER TABLE public.categories
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) No duplicate category names inside the same restaurant (case-insensitive)
CREATE UNIQUE INDEX categories_restaurant_name_lower_key
  ON public.categories (restaurant_id, lower(name));

-- 3) display_order can't be negative
ALTER TABLE public.categories
  ADD CONSTRAINT categories_display_order_check CHECK (display_order >= 0);
-- ---------------------------------------------------------------------
-- 4. menu_items
-- ---------------------------------------------------------------------
CREATE TABLE public.menu_items (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id  UUID          NOT NULL
                   REFERENCES public.restaurants (id) ON DELETE CASCADE,
    category_id    UUID          NOT NULL,
    title          VARCHAR(150)  NOT NULL,
    description    TEXT,
    price          NUMERIC(10,2) NOT NULL,
    image_url      TEXT,
    is_available   BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT menu_items_price_check CHECK (price >= 0),

    -- Composite FK: the category MUST belong to the same restaurant
    CONSTRAINT menu_items_category_tenant_fkey
        FOREIGN KEY (category_id, restaurant_id)
        REFERENCES public.categories (id, restaurant_id)
        ON DELETE CASCADE
);

-- Items of a category within a tenant (public menu + dashboard)
CREATE INDEX idx_menu_items_restaurant_category
    ON public.menu_items (restaurant_id, category_id);

-- Supports the composite FK check on category deletes/updates
CREATE INDEX idx_menu_items_category_id
    ON public.menu_items (category_id);

-- ---------------------------------------------------------------------
-- 5. Row Level Security (Supabase)
-- ---------------------------------------------------------------------
-- =====================================================================
-- RLS: no policies => unreachable via anon/authenticated (PostgREST).
-- Only your backend (service_role / direct DB connection) can access them.
-- =====================================================================
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions    ENABLE ROW LEVEL SECURITY;

-- Public (customer-facing) read-only access to menu data
CREATE POLICY "public read restaurants" ON public.restaurants
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "public read categories" ON public.categories
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "public read menu_items" ON public.menu_items
    FOR SELECT TO anon, authenticated USING (true);

-- No policies on public.users => inaccessible to anon/authenticated.
-- All writes + user access go through the backend using the service_role key
-- (which bypasses RLS).


-- Needed for the composite FK from offer_items (tenant safety, same pattern as categories)
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_id_restaurant_key UNIQUE (id, restaurant_id);

-- ---------------------------------------------------------------------
-- offers
-- ---------------------------------------------------------------------
CREATE TABLE public.offers (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id  UUID          NOT NULL
                   REFERENCES public.restaurants (id) ON DELETE CASCADE,
    title          VARCHAR(150)  NOT NULL,
    description    VARCHAR(1000),
    image_url      TEXT,                          -- written only by the upload endpoint
    offer_price    NUMERIC(10,2),                 -- NULL = announcement without a price
    starts_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    ends_at        TIMESTAMPTZ   NOT NULL,        -- what makes it an "offer"
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT offers_id_restaurant_key UNIQUE (id, restaurant_id),
    CONSTRAINT offers_price_check CHECK (offer_price IS NULL OR offer_price >= 0),
    CONSTRAINT offers_dates_check CHECK (ends_at > starts_at)
);

-- Public query: this restaurant's offers by end date
CREATE INDEX idx_offers_restaurant_ends ON public.offers (restaurant_id, ends_at);

CREATE TRIGGER trg_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- offer_items: a real menu item OR a free text line (exactly one)
-- ---------------------------------------------------------------------
CREATE TABLE public.offer_items (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id       UUID         NOT NULL,
    restaurant_id  UUID         NOT NULL,
    menu_item_id   UUID,
    custom_label   VARCHAR(150),
    quantity       INT          NOT NULL DEFAULT 1,
    display_order  INT          NOT NULL DEFAULT 0,

    CONSTRAINT offer_items_kind_check
        CHECK ((menu_item_id IS NOT NULL) <> (custom_label IS NOT NULL)),
    CONSTRAINT offer_items_quantity_check CHECK (quantity BETWEEN 1 AND 99),

    -- both parents must belong to the SAME restaurant (a NULL menu_item_id skips this check)
    CONSTRAINT offer_items_offer_tenant_fkey
        FOREIGN KEY (offer_id, restaurant_id)
        REFERENCES public.offers (id, restaurant_id) ON DELETE CASCADE,
    CONSTRAINT offer_items_item_tenant_fkey
        FOREIGN KEY (menu_item_id, restaurant_id)
        REFERENCES public.menu_items (id, restaurant_id) ON DELETE CASCADE
);

CREATE INDEX idx_offer_items_offer_id ON public.offer_items (offer_id);
CREATE INDEX idx_offer_items_menu_item_id ON public.offer_items (menu_item_id);

-- the same menu item can't appear twice in one offer (use quantity instead)
CREATE UNIQUE INDEX offer_items_offer_menu_item_key
  ON public.offer_items (offer_id, menu_item_id) WHERE menu_item_id IS NOT NULL;

-- Backend only (same as users/sessions): no policies
ALTER TABLE public.offers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_items ENABLE ROW LEVEL SECURITY;





  SELECT cron.schedule('cleanup-sessions', '0 3 * * *',
    $$DELETE FROM public.sessions WHERE expires_at < now() OR revoked_at < now() - interval '7 days'$$);

