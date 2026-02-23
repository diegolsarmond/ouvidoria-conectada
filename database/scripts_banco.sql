-- =========================================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS - OUVIDORIA CONECTADA
-- SGDB Recomendado: PostgreSQL
-- =========================================================================

-- Habilitar a extensão para geração de UUIDs no PostgreSQL (se não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. Tabela: Órgãos (organs)
-- -------------------------------------------------------------------------
CREATE TABLE organs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    acronym VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ativo', 'inativo')),
    email VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 2. Tabela: Usuários (users)
-- -------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    registration VARCHAR(50) UNIQUE NOT NULL, -- Matrícula
    role VARCHAR(50) NOT NULL CHECK (role IN ('administrador', 'ouvidor', 'atendente', 'gestor_orgao')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('ativo', 'inativo')),
    primary_organ_id UUID REFERENCES organs(id) ON DELETE SET NULL,
    avatar VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 3. Tabela Relacional: Usuários e Órgãos (user_organs)
-- (NxM - Um atendente pode ver demandas de mais de um órgão)
-- -------------------------------------------------------------------------
CREATE TABLE user_organs (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organ_id UUID REFERENCES organs(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, organ_id)
);

-- -------------------------------------------------------------------------
-- 4. Tabela: Demandas (demands)
-- -------------------------------------------------------------------------
CREATE TABLE demands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocol VARCHAR(20) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('reclamacao', 'denuncia', 'elogio', 'sugestao', 'solicitacao')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('registrada', 'em_analise', 'em_atendimento', 'respondida', 'concluida', 'cancelada')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
    organ_id UUID NOT NULL REFERENCES organs(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('whatsapp', 'presencial', 'telefone', 'email', 'internet')),
    anonymous BOOLEAN DEFAULT FALSE,
    citizen_name VARCHAR(255),
    citizen_cpf VARCHAR(14),
    citizen_phone VARCHAR(20),
    citizen_email VARCHAR(255),
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    attachments_count INTEGER DEFAULT 0,
    deadline TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 5. Tabela: Histórico / Tramitação / Acompanhamento Interativo (demand_history)
-- -------------------------------------------------------------------------
CREATE TABLE demand_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demand_id UUID NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Se NULL, quem alterou foi o próprio Sistema
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 6. Índices Extras de Performance (Opcional, porém Recomendado)
-- -------------------------------------------------------------------------
CREATE INDEX idx_demands_protocol ON demands(protocol);
CREATE INDEX idx_demands_status_priority ON demands(status, priority);
CREATE INDEX idx_demands_organ_id ON demands(organ_id);
CREATE INDEX idx_history_demand_id ON demand_history(demand_id);
CREATE INDEX idx_users_cpf_email ON users(cpf, email);

-- -------------------------------------------------------------------------
-- 7. Funções e Triggers (Automatizando o Updated_At)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organs_updated_at BEFORE UPDATE ON organs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_demands_updated_at BEFORE UPDATE ON demands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
