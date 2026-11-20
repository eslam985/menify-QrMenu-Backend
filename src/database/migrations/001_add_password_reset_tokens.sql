-- =====================================================================
-- Migration: add password_reset_tokens table
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL
                REFERENCES public.users (id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL,           -- SHA-256 of the raw OTP token
    expires_at  TIMESTAMPTZ NOT NULL,           -- 15 minutes from creation
    used_at     TIMESTAMPTZ,                    -- set when consumed (one-time use)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash)
);

-- Fast lookup by token hash (the most common query)
CREATE INDEX IF NOT EXISTS idx_prt_token_hash
    ON public.password_reset_tokens (token_hash);

-- Fast cleanup of expired tokens & lookup by user (to enforce one active token per user)
CREATE INDEX IF NOT EXISTS idx_prt_user_id
    ON public.password_reset_tokens (user_id);

-- Only the backend accesses this table (no RLS policies = inaccessible via anon/authenticated)
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup: runs at 03:00 UTC every day (requires pg_cron extension, same as sessions cleanup)
-- SELECT cron.schedule('cleanup-password-reset-tokens', '5 3 * * *',
--   $$DELETE FROM public.password_reset_tokens WHERE expires_at < now() OR used_at IS NOT NULL$$);
