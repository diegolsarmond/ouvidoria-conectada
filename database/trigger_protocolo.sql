-- =========================================================================
-- TRIGGER PARA GERAR PROTOCOLO AUTOMATICAMENTE
-- =========================================================================

-- 1. Criação da SEQUENCE para protocolos (Ano + 6 dígitos)
CREATE SEQUENCE IF NOT EXISTS protocol_seq START 1;

-- 2. Função padronizada para obter o próximo protocolo
CREATE OR REPLACE FUNCTION fn_get_next_protocol()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    seq_val BIGINT;
BEGIN
    current_year := to_char(CURRENT_DATE, 'YYYY');
    seq_val := nextval('protocol_seq');
    RETURN current_year || lpad(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Função da trigger que usa o gerador centralizado
CREATE OR REPLACE FUNCTION generate_demand_protocol()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o protocolo já vem preenchido (ex: vindo de conversas_ativas), não gera novo
    IF NEW.protocol IS NULL OR NEW.protocol = '' THEN
        NEW.protocol := fn_get_next_protocol();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criação da trigger na tabela demands
DROP TRIGGER IF EXISTS trg_generate_demand_protocol ON demands;
CREATE TRIGGER trg_generate_demand_protocol
BEFORE INSERT ON demands
FOR EACH ROW
EXECUTE FUNCTION generate_demand_protocol();
