-- =========================================================================
-- Migration: Adicionar suporte a autenticação própria (sem Supabase Auth)
-- Execute este script no banco PostgreSQL: ouvidoria@38.225.221.230:5434
-- =========================================================================

-- 1. Adicionar coluna password_hash em ouvidoria_users (se não existir)
ALTER TABLE public.ouvidoria_users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. Criar tabela de refresh tokens
CREATE TABLE IF NOT EXISTS public.ouvidoria_refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.ouvidoria_users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ouvidoria_refresh_tokens_user_id
    ON public.ouvidoria_refresh_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_ouvidoria_refresh_tokens_token
    ON public.ouvidoria_refresh_tokens (token);

-- 3. Criar tabela de tokens de reset de senha
CREATE TABLE IF NOT EXISTS public.ouvidoria_password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.ouvidoria_users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ouvidoria_password_reset_tokens_token
    ON public.ouvidoria_password_reset_tokens (token);
