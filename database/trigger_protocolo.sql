-- =========================================================================
-- TRIGGER PARA GERAR PROTOCOLO AUTOMATICAMENTE
-- =========================================================================

-- Função que gera o protocolo
CREATE OR REPLACE FUNCTION generate_demand_protocol()
RETURNS TRIGGER AS $$
DECLARE
    current_year TEXT;
    seq TEXT;
    demand_count INT;
BEGIN
    -- Pega o ano atual
    current_year := to_char(CURRENT_DATE, 'YYYY');
    
    -- Conta quantas demandas existem para gerar o sequencial
    SELECT COUNT(*) INTO demand_count FROM demands;
    
    -- Formata o sequencial com 6 dígitos (ex: 000001, 000002)
    seq := lpad((demand_count + 1)::TEXT, 6, '0');
    
    -- Define o protocolo: Ano + Sequencial
    NEW.protocol := current_year || seq;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cria a trigger que chama a função ANTES de inserir (BEFORE INSERT)
DROP TRIGGER IF EXISTS trg_generate_demand_protocol ON demands;
CREATE TRIGGER trg_generate_demand_protocol
BEFORE INSERT ON demands
FOR EACH ROW
EXECUTE FUNCTION generate_demand_protocol();
