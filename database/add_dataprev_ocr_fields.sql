-- =========================================================================
-- Migration: Campos Dataprev OCR - ecogestão.dataprev.gov.br
-- Fonte: Extrato do Trabalhador (tela de Vínculos)
-- Execute no SQL Editor do Supabase
-- =========================================================================

-- -------------------------------------------------------------------------
-- Bloco 1: Dados do Trabalhador
-- (demandante_nome, demandante_cpf, demandante_data_nascimento e
--  demandante_situacao já existem via migration add_demandante_situacao.sql)
-- -------------------------------------------------------------------------
ALTER TABLE ouvidoria_demands
  ADD COLUMN IF NOT EXISTS demandante_nome             TEXT,
  ADD COLUMN IF NOT EXISTS demandante_cpf              TEXT,
  ADD COLUMN IF NOT EXISTS demandante_data_nascimento  TEXT,
  ADD COLUMN IF NOT EXISTS demandante_situacao         TEXT,
  ADD COLUMN IF NOT EXISTS demandante_sexo             TEXT,
  ADD COLUMN IF NOT EXISTS demandante_nome_mae         TEXT,
  ADD COLUMN IF NOT EXISTS demandante_exposicao_politica TEXT;

COMMENT ON COLUMN ouvidoria_demands.demandante_nome              IS 'Nome completo do trabalhador extraído via OCR ou preenchido manualmente';
COMMENT ON COLUMN ouvidoria_demands.demandante_cpf               IS 'CPF do trabalhador (formato NNN.NNN.NNN-NN)';
COMMENT ON COLUMN ouvidoria_demands.demandante_data_nascimento   IS 'Data de nascimento do trabalhador (formato DD/MM/AAAA)';
COMMENT ON COLUMN ouvidoria_demands.demandante_situacao          IS 'Situação do cidadão (ex: Aposentado, Empregado, Estudante)';
COMMENT ON COLUMN ouvidoria_demands.demandante_sexo              IS 'Sexo do trabalhador conforme Dataprev (ex: 3 - Feminino)';
COMMENT ON COLUMN ouvidoria_demands.demandante_nome_mae          IS 'Nome da mãe do trabalhador';
COMMENT ON COLUMN ouvidoria_demands.demandante_exposicao_politica IS 'Indicador de Pessoa Exposta Politicamente (PEP)';

-- -------------------------------------------------------------------------
-- Bloco 2: Dados do Vínculo Empregatício
-- -------------------------------------------------------------------------
ALTER TABLE ouvidoria_demands
  ADD COLUMN IF NOT EXISTS vinculo_empregador_cnpj          TEXT,
  ADD COLUMN IF NOT EXISTS vinculo_empregador_nome          TEXT,
  ADD COLUMN IF NOT EXISTS vinculo_matricula                TEXT,
  ADD COLUMN IF NOT EXISTS vinculo_data_admissao            TEXT,
  ADD COLUMN IF NOT EXISTS vinculo_data_inicio_atividade    TEXT,
  ADD COLUMN IF NOT EXISTS vinculo_bloqueio                 TEXT,
  ADD COLUMN IF NOT EXISTS vinculo_elegivel                 TEXT,
  ADD COLUMN IF NOT EXISTS vinculo_motivo_inelegibilidade   TEXT,
  ADD COLUMN IF NOT EXISTS vinculo_data_desligamento        TEXT,
  ADD COLUMN IF NOT EXISTS vinculo_motivo_desligamento      TEXT,
  ADD COLUMN IF NOT EXISTS vinculo_classificacao_tributaria TEXT,
  ADD COLUMN IF NOT EXISTS vinculo_categoria_trabalhador    TEXT,
  ADD COLUMN IF NOT EXISTS vinculo_cnae                     TEXT,
  ADD COLUMN IF NOT EXISTS vinculo_cbo                      TEXT,
  ADD COLUMN IF NOT EXISTS vinculo_periodo_referencia       TEXT;

COMMENT ON COLUMN ouvidoria_demands.vinculo_empregador_cnpj          IS 'CNPJ do empregador extraído via OCR (ex: 03.471.344)';
COMMENT ON COLUMN ouvidoria_demands.vinculo_empregador_nome          IS 'Razão social do empregador (ex: CAOA MONTADORA DE VEICULOS LTDA)';
COMMENT ON COLUMN ouvidoria_demands.vinculo_matricula                IS 'Matrícula do trabalhador no empregador (ex: C12S008520)';
COMMENT ON COLUMN ouvidoria_demands.vinculo_data_admissao            IS 'Data de admissão no vínculo (formato DD/MM/AAAA)';
COMMENT ON COLUMN ouvidoria_demands.vinculo_data_inicio_atividade    IS 'Data de início da atividade no vínculo (formato DD/MM/AAAA)';
COMMENT ON COLUMN ouvidoria_demands.vinculo_bloqueio                 IS 'Situação de bloqueio do vínculo (ex: 0 - Sem Bloqueio)';
COMMENT ON COLUMN ouvidoria_demands.vinculo_elegivel                 IS 'Elegibilidade do vínculo para empréstimo consignado (SIM/NÃO)';
COMMENT ON COLUMN ouvidoria_demands.vinculo_motivo_inelegibilidade   IS 'Motivo da inelegibilidade quando aplicável (ex: 8 - Vínculo com empréstimo encerrado por término de vínculo anterior)';
COMMENT ON COLUMN ouvidoria_demands.vinculo_data_desligamento        IS 'Data de desligamento do trabalhador (formato DD/MM/AAAA ou vazio)';
COMMENT ON COLUMN ouvidoria_demands.vinculo_motivo_desligamento      IS 'Motivo do desligamento quando houver';
COMMENT ON COLUMN ouvidoria_demands.vinculo_classificacao_tributaria IS 'Classificação tributária do vínculo (ex: 99 - Pessoas Jurídicas em geral)';
COMMENT ON COLUMN ouvidoria_demands.vinculo_categoria_trabalhador   IS 'Categoria do trabalhador conforme eSocial (ex: 101)';
COMMENT ON COLUMN ouvidoria_demands.vinculo_cnae                     IS 'Código CNAE da atividade econômica (ex: 2910701)';
COMMENT ON COLUMN ouvidoria_demands.vinculo_cbo                      IS 'Código CBO da ocupação do trabalhador (ex: 411010)';
COMMENT ON COLUMN ouvidoria_demands.vinculo_periodo_referencia       IS 'Período de referência da competência consultada (ex: 01/2026)';

-- -------------------------------------------------------------------------
-- Bloco 3: Controle de auditoria do OCR
-- -------------------------------------------------------------------------
ALTER TABLE ouvidoria_demands
  ADD COLUMN IF NOT EXISTS dataprev_ocr_raw         JSONB,
  ADD COLUMN IF NOT EXISTS dataprev_ocr_extraido_em TIMESTAMP,
  ADD COLUMN IF NOT EXISTS dataprev_ocr_usuario_id  UUID REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN ouvidoria_demands.dataprev_ocr_raw         IS 'Payload JSON completo retornado pelo OCR da tela Dataprev (para reprocessamento futuro)';
COMMENT ON COLUMN ouvidoria_demands.dataprev_ocr_extraido_em IS 'Data/hora em que a extração OCR foi realizada';
COMMENT ON COLUMN ouvidoria_demands.dataprev_ocr_usuario_id  IS 'Usuário que disparou a extração OCR';

-- -------------------------------------------------------------------------
-- Índice para buscas por CPF e CNPJ via dados Dataprev
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ouvidoria_demands_demandante_cpf    ON ouvidoria_demands(demandante_cpf);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_demands_vinculo_cnpj      ON ouvidoria_demands(vinculo_empregador_cnpj);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_demands_dataprev_ocr_json ON ouvidoria_demands USING GIN (dataprev_ocr_raw);
