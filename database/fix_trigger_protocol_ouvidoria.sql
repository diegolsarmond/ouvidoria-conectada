-- =========================================================================
-- Fix: Recriar trigger de protocolo para a tabela renomeada ouvidoria_demands
-- O trigger original foi criado para 'demands' antes do rename.
-- =========================================================================

-- Garante que a sequence existe
CREATE SEQUENCE IF NOT EXISTS protocol_seq START 1;

-- Garante que a função geradora existe
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

-- Recria a função da trigger
CREATE OR REPLACE FUNCTION generate_demand_protocol()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.protocol IS NULL OR NEW.protocol = '' THEN
        NEW.protocol := fn_get_next_protocol();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger antiga (tabela antiga, caso ainda exista)
DROP TRIGGER IF EXISTS trg_generate_demand_protocol ON demands;

-- Remove trigger na tabela correta (caso exista versão antiga)
DROP TRIGGER IF EXISTS trg_generate_demand_protocol ON ouvidoria_demands;

-- Cria trigger na tabela correta
CREATE TRIGGER trg_generate_demand_protocol
BEFORE INSERT ON ouvidoria_demands
FOR EACH ROW
EXECUTE FUNCTION generate_demand_protocol();
