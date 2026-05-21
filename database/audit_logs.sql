-- ─── Tabela de Logs de Auditoria ─────────────────────────────────────────────
-- Registra todas as ações importantes do sistema para fins de auditoria.
-- Execute este script diretamente no banco PostgreSQL.

-- ─── BLOCO 1: Criar tabela ────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.ouvidoria_audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action      VARCHAR(100) NOT NULL,           -- Ex: 'login', 'create_demand', 'update_demand'
    entity_type VARCHAR(50),                     -- Ex: 'demand', 'user', 'organ', 'auth', 'prompt'
    entity_id   VARCHAR(255),                    -- UUID ou ID da entidade afetada
    entity_name VARCHAR(500),                    -- Nome/protocolo legível (para histórico)
    user_id     UUID REFERENCES public.ouvidoria_users(id) ON DELETE SET NULL,
    user_name   VARCHAR(255),                    -- Denormalizado para preservar histórico
    user_role   VARCHAR(50),                     -- Papel do usuário no momento da ação
    description TEXT,                            -- Descrição legível do que ocorreu
    old_values  JSONB,                           -- Estado anterior (para edições)
    new_values  JSONB,                           -- Novo estado (para criações/edições)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_ouvidoria_audit_logs_created_at  ON public.ouvidoria_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_audit_logs_user_id     ON public.ouvidoria_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_audit_logs_action      ON public.ouvidoria_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_audit_logs_entity_type ON public.ouvidoria_audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_audit_logs_entity_id   ON public.ouvidoria_audit_logs (entity_id);

-- Comentários nas colunas
COMMENT ON TABLE  public.ouvidoria_audit_logs              IS 'Log de auditoria de todas as ações importantes do sistema';
COMMENT ON COLUMN public.ouvidoria_audit_logs.action       IS 'Tipo da ação: login, logout, create_demand, update_demand, create_user, update_user, create_organ, update_organ, generate_response, reject_response, assign_demand, update_prompts, reset_password, add_user_organ, remove_user_organ';
COMMENT ON COLUMN public.ouvidoria_audit_logs.entity_type  IS 'Tipo da entidade: auth, demand, user, organ, prompt, user_organ';
COMMENT ON COLUMN public.ouvidoria_audit_logs.entity_name  IS 'Identificador legível: protocolo da demanda, nome do usuário, sigla do órgão';
COMMENT ON COLUMN public.ouvidoria_audit_logs.old_values   IS 'Snapshot JSON do estado anterior (somente para operações de update)';
COMMENT ON COLUMN public.ouvidoria_audit_logs.new_values   IS 'Snapshot JSON do novo estado';
