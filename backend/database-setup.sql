-- =============================================================================
-- OUVIDORIA CONECTADA - Setup do Banco PostgreSQL (sem Supabase)
-- Execute este script no novo servidor PostgreSQL
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ouvidoria_organs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ouvidoria_organs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    acronym     VARCHAR(20)  NOT NULL,
    status      VARCHAR(20)  NOT NULL CHECK (status IN ('ativo', 'inativo')),
    email       VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. ouvidoria_users  (sem FK para auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ouvidoria_users (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name             VARCHAR(255) NOT NULL,
    cpf              VARCHAR(14)  UNIQUE NOT NULL,
    email            VARCHAR(255) UNIQUE NOT NULL,
    registration     VARCHAR(50)  UNIQUE NOT NULL,
    role             VARCHAR(50)  NOT NULL CHECK (role IN ('administrador','ouvidor','atendente','gestor_orgao')),
    status           VARCHAR(20)  NOT NULL CHECK (status IN ('ativo','inativo')),
    primary_organ_id UUID REFERENCES ouvidoria_organs(id) ON DELETE SET NULL,
    avatar           VARCHAR(500),
    password_hash    VARCHAR(255),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. ouvidoria_refresh_tokens  (substitui auth.sessions do Supabase)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ouvidoria_refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES ouvidoria_users(id) ON DELETE CASCADE,
    token      VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. ouvidoria_password_reset_tokens
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ouvidoria_password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES ouvidoria_users(id) ON DELETE CASCADE,
    token      VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. ouvidoria_user_organs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ouvidoria_user_organs (
    user_id  UUID REFERENCES ouvidoria_users(id) ON DELETE CASCADE,
    organ_id UUID REFERENCES ouvidoria_organs(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, organ_id)
);

-- -----------------------------------------------------------------------------
-- 6. ouvidoria_demands
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ouvidoria_demands (
    id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocol                        VARCHAR(20) UNIQUE,
    type                            VARCHAR(50) NOT NULL CHECK (type IN ('reclamacao','denuncia','elogio','sugestao','solicitacao')),
    status                          VARCHAR(50) NOT NULL CHECK (status IN ('registrada','em_analise','em_atendimento','respondida','concluida','cancelada')),
    priority                        VARCHAR(20) NOT NULL CHECK (priority IN ('baixa','media','alta','urgente')),
    organ_id                        UUID REFERENCES ouvidoria_organs(id) ON DELETE RESTRICT,
    description                     TEXT NOT NULL,
    channel                         VARCHAR(50) NOT NULL CHECK (channel IN ('whatsapp','presencial','telefone','email','internet')),
    anonymous                       BOOLEAN DEFAULT FALSE,
    citizen_name                    VARCHAR(255),
    citizen_cpf                     VARCHAR(14),
    citizen_phone                   VARCHAR(20),
    citizen_email                   VARCHAR(255),
    assigned_to_id                  UUID REFERENCES ouvidoria_users(id) ON DELETE SET NULL,
    attachments_count               INTEGER DEFAULT 0,
    deadline                        TIMESTAMPTZ NOT NULL,
    -- Campos demandante / OCR
    demandante_nome                 VARCHAR(255),
    demandante_cpf                  VARCHAR(14),
    demandante_data_nascimento      DATE,
    demandante_situacao             VARCHAR(100),
    demandante_sexo                 VARCHAR(20),
    demandante_nome_mae             VARCHAR(255),
    demandante_exposicao_politica   VARCHAR(50),
    vinculo_empregador_cnpj         VARCHAR(20),
    vinculo_empregador_nome         VARCHAR(255),
    vinculo_matricula               VARCHAR(50),
    vinculo_data_admissao           DATE,
    vinculo_data_inicio_atividade   DATE,
    vinculo_bloqueio                VARCHAR(50),
    vinculo_elegivel                VARCHAR(50),
    vinculo_motivo_inelegibilidade  TEXT,
    vinculo_data_desligamento       DATE,
    vinculo_motivo_desligamento     TEXT,
    vinculo_classificacao_tributaria VARCHAR(100),
    vinculo_categoria_trabalhador   VARCHAR(100),
    vinculo_cnae                    VARCHAR(20),
    vinculo_cbo                     VARCHAR(20),
    vinculo_periodo_referencia      VARCHAR(20),
    created_at                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. ouvidoria_demand_history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ouvidoria_demand_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demand_id   UUID NOT NULL REFERENCES ouvidoria_demands(id) ON DELETE CASCADE,
    action      VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    user_id     UUID REFERENCES ouvidoria_users(id) ON DELETE SET NULL,
    from_status VARCHAR(50),
    to_status   VARCHAR(50),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. ouvidoria_conversas_ativas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ouvidoria_conversas_ativas (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocolo           VARCHAR(50),
    remotejid           VARCHAR(255),
    anonimo             BOOLEAN DEFAULT FALSE,
    nome                VARCHAR(255),
    cpf                 VARCHAR(14),
    telefone            VARCHAR(20),
    email               VARCHAR(255),
    tipo_manifestacao   VARCHAR(50),
    area                VARCHAR(255),
    assunto             VARCHAR(255),
    demanda             TEXT,
    status              VARCHAR(50),
    endereco            TEXT,
    bairro              VARCHAR(255),
    cidade              VARCHAR(255),
    ponto_referencia    TEXT,
    data_ocorrencia     DATE,
    hora_ocorrencia     TIME,
    recorrente          BOOLEAN,
    descricao_detalhada TEXT,
    canal_origem        VARCHAR(50),
    confirmado_usuario  BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. ouvidoria_assistant_prompts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ouvidoria_assistant_prompts (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orquestrador             TEXT DEFAULT '',
    cadastro                 TEXT DEFAULT '',
    consulta                 TEXT DEFAULT '',
    atendimento              TEXT DEFAULT '',
    triagem                  TEXT DEFAULT '',
    saudacao                 TEXT DEFAULT '',
    base_conhecimento        TEXT DEFAULT '',
    base_conhecimento_pdf_url TEXT,
    updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. ouvidoria_audit_logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ouvidoria_audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   UUID,
    entity_name VARCHAR(255),
    user_id     UUID,
    user_name   VARCHAR(255),
    user_role   VARCHAR(50),
    description TEXT,
    old_values  JSONB,
    new_values  JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Trigger: gera protocolo automático nas demandas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ouvidoria_generate_protocol()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    seq_num     INTEGER;
BEGIN
    IF NEW.protocol IS NOT NULL AND NEW.protocol <> '' THEN
        RETURN NEW;
    END IF;
    year_prefix := TO_CHAR(NOW(), 'YYYY');
    SELECT COUNT(*) + 1 INTO seq_num
    FROM ouvidoria_demands
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    NEW.protocol := year_prefix || LPAD(seq_num::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ouvidoria_generate_protocol ON ouvidoria_demands;
CREATE TRIGGER trg_ouvidoria_generate_protocol
    BEFORE INSERT ON ouvidoria_demands
    FOR EACH ROW EXECUTE FUNCTION ouvidoria_generate_protocol();

-- -----------------------------------------------------------------------------
-- Índices para performance
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_demands_status        ON ouvidoria_demands(status);
CREATE INDEX IF NOT EXISTS idx_demands_organ_id      ON ouvidoria_demands(organ_id);
CREATE INDEX IF NOT EXISTS idx_demands_created_at    ON ouvidoria_demands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_demand_id     ON ouvidoria_demand_history(demand_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at      ON ouvidoria_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_token         ON ouvidoria_refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_token           ON ouvidoria_password_reset_tokens(token);

-- =============================================================================
-- MIGRACAO: Se estiver migrando dados do Supabase, execute após migrar os dados:
--
-- 1. Exporte dados do Supabase: pg_dump -t 'public.ouvidoria_*' ... > dump.sql
-- 2. Ajuste o dump removendo referências a auth.users
-- 3. Importe: psql -h 38.225.221.230 -p 5434 -U postgres -d ouvidoria < dump.sql
-- 4. Defina senha dos usuários existentes:
--    UPDATE ouvidoria_users SET password_hash = '$2b$12$...' WHERE email = '...';
-- =============================================================================
