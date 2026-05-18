-- =========================================================================
-- Migration: Renomear tabelas com prefixo ouvidoria_
-- Execute no SQL Editor do Supabase
--
-- ATENÇÃO: Execute em ordem. Não divida os blocos.
-- AVISO: Se houver um chatbot externo escrevendo em conversas_ativas,
--        atualize o endpoint do bot para ouvidoria_conversas_ativas.
-- =========================================================================

BEGIN;

-- ─── BLOCO 1: Renomear tabelas ────────────────────────────────────────────────

ALTER TABLE public.organs            RENAME TO ouvidoria_organs;
ALTER TABLE public.users             RENAME TO ouvidoria_users;
ALTER TABLE public.user_organs       RENAME TO ouvidoria_user_organs;
ALTER TABLE public.demands           RENAME TO ouvidoria_demands;
ALTER TABLE public.demand_history    RENAME TO ouvidoria_demand_history;
ALTER TABLE public.audit_logs        RENAME TO ouvidoria_audit_logs;
ALTER TABLE public.assistant_prompts RENAME TO ouvidoria_assistant_prompts;
ALTER TABLE public.conversas_ativas  RENAME TO ouvidoria_conversas_ativas;

-- ─── BLOCO 2: Renomear índices para consistência ──────────────────────────────

ALTER INDEX IF EXISTS idx_demands_protocol            RENAME TO idx_ouvidoria_demands_protocol;
ALTER INDEX IF EXISTS idx_demands_status_priority     RENAME TO idx_ouvidoria_demands_status_priority;
ALTER INDEX IF EXISTS idx_demands_organ_id            RENAME TO idx_ouvidoria_demands_organ_id;
ALTER INDEX IF EXISTS idx_history_demand_id           RENAME TO idx_ouvidoria_history_demand_id;
ALTER INDEX IF EXISTS idx_users_cpf_email             RENAME TO idx_ouvidoria_users_cpf_email;
ALTER INDEX IF EXISTS idx_demands_demandante_cpf      RENAME TO idx_ouvidoria_demands_demandante_cpf;
ALTER INDEX IF EXISTS idx_demands_vinculo_cnpj        RENAME TO idx_ouvidoria_demands_vinculo_cnpj;
ALTER INDEX IF EXISTS idx_demands_dataprev_ocr_json   RENAME TO idx_ouvidoria_demands_dataprev_ocr_json;
ALTER INDEX IF EXISTS idx_audit_logs_created_at       RENAME TO idx_ouvidoria_audit_logs_created_at;
ALTER INDEX IF EXISTS idx_audit_logs_user_id          RENAME TO idx_ouvidoria_audit_logs_user_id;
ALTER INDEX IF EXISTS idx_audit_logs_action           RENAME TO idx_ouvidoria_audit_logs_action;
ALTER INDEX IF EXISTS idx_audit_logs_entity_type      RENAME TO idx_ouvidoria_audit_logs_entity_type;
ALTER INDEX IF EXISTS idx_audit_logs_entity_id        RENAME TO idx_ouvidoria_audit_logs_entity_id;

-- ─── BLOCO 3: Recriar a trigger de protocolo na tabela renomeada ──────────────
-- (triggers seguem o rename, mas recriar garante referência explícita correta)

DROP TRIGGER IF EXISTS trg_generate_demand_protocol ON public.ouvidoria_demands;
CREATE TRIGGER trg_generate_demand_protocol
BEFORE INSERT ON public.ouvidoria_demands
FOR EACH ROW
EXECUTE FUNCTION generate_demand_protocol();

-- ─── BLOCO 4: Atualizar funções com referências hardcoded a nomes de tabelas ──

-- 4a. Função que sincroniza conversas_ativas → demands (usa demands e organs no body)
CREATE OR REPLACE FUNCTION sync_conversa_to_demands()
RETURNS TRIGGER AS $$
DECLARE
    v_organ_id UUID;
BEGIN
    IF (OLD.status = 'PRE_CADASTRO' AND NEW.status = 'CONCLUIDO') THEN

        IF EXISTS (SELECT 1 FROM ouvidoria_demands WHERE protocol = NEW.protocolo) THEN
            RETURN NEW;
        END IF;

        SELECT id INTO v_organ_id FROM ouvidoria_organs WHERE acronym = NEW.area LIMIT 1;
        IF v_organ_id IS NULL THEN
            SELECT id INTO v_organ_id FROM ouvidoria_organs WHERE status = 'ativo' LIMIT 1;
        END IF;

        INSERT INTO ouvidoria_demands (
            protocol, type, status, priority, organ_id, description,
            channel, anonymous, citizen_name, citizen_cpf, citizen_phone,
            citizen_email, deadline
        ) VALUES (
            NEW.protocolo,
            COALESCE(LOWER(NEW.tipo_manifestacao), 'solicitacao'),
            'registrada', 'media', v_organ_id, NEW.demanda,
            'whatsapp', NEW.anonimo, NEW.nome, NEW.cpf,
            NEW.telefone, NEW.email, NOW() + interval '20 days'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4b. Recriar triggers da ouvidoria_conversas_ativas com referência nova
DROP TRIGGER IF EXISTS trg_before_insert_conversa ON public.ouvidoria_conversas_ativas;
CREATE TRIGGER trg_before_insert_conversa
BEFORE INSERT ON public.ouvidoria_conversas_ativas
FOR EACH ROW
EXECUTE FUNCTION trg_fn_generate_conversa_protocol();

DROP TRIGGER IF EXISTS trg_sync_conversas_demands ON public.ouvidoria_conversas_ativas;
CREATE TRIGGER trg_sync_conversas_demands
AFTER UPDATE ON public.ouvidoria_conversas_ativas
FOR EACH ROW
EXECUTE FUNCTION sync_conversa_to_demands();

-- ─── BLOCO 5: Recriar RLS Policies que referenciam public.users por nome ──────
-- PostgreSQL armazena expressões USING/WITH CHECK como texto — o rename de
-- ouvidoria_users não atualiza automaticamente referências a public.users
-- dentro das policies de OUTRAS tabelas.

-- 5a. ouvidoria_audit_logs → referenciava public.users
DROP POLICY IF EXISTS "admins_can_read_audit_logs" ON public.ouvidoria_audit_logs;
CREATE POLICY "admins_can_read_audit_logs"
    ON public.ouvidoria_audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ouvidoria_users
            WHERE id = auth.uid() AND role = 'administrador'
        )
    );

-- 5b. ouvidoria_organs → referenciava public.users
DROP POLICY IF EXISTS "Admins podem criar órgãos" ON public.ouvidoria_organs;
CREATE POLICY "Admins podem criar órgãos"
    ON public.ouvidoria_organs FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ouvidoria_users u
            WHERE u.id = auth.uid() AND u.role = 'administrador'
        )
    );

DROP POLICY IF EXISTS "Admins podem atualizar órgãos" ON public.ouvidoria_organs;
CREATE POLICY "Admins podem atualizar órgãos"
    ON public.ouvidoria_organs FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ouvidoria_users u
            WHERE u.id = auth.uid() AND u.role = 'administrador'
        )
    );

-- 5c. ouvidoria_users → self-reference nas policies
DROP POLICY IF EXISTS "Usuário pode inserir seu próprio perfil ou admin pode inserir qualquer" ON public.ouvidoria_users;
CREATE POLICY "Usuário pode inserir seu próprio perfil ou admin pode inserir qualquer"
    ON public.ouvidoria_users FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.ouvidoria_users u
            WHERE u.id = auth.uid() AND u.role = 'administrador'
        )
    );

DROP POLICY IF EXISTS "Usuário pode atualizar seu perfil ou admin pode atualizar qualquer" ON public.ouvidoria_users;
CREATE POLICY "Usuário pode atualizar seu perfil ou admin pode atualizar qualquer"
    ON public.ouvidoria_users FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.ouvidoria_users u
            WHERE u.id = auth.uid() AND u.role = 'administrador'
        )
    );

COMMIT;
