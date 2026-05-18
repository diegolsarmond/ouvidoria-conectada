-- Migration: adiciona colunas de situação do demandante na tabela demands
-- Execute no SQL Editor do Supabase

ALTER TABLE demands
  ADD COLUMN IF NOT EXISTS demandante_nome             TEXT,
  ADD COLUMN IF NOT EXISTS demandante_cpf              TEXT,
  ADD COLUMN IF NOT EXISTS demandante_data_nascimento  TEXT,
  ADD COLUMN IF NOT EXISTS demandante_situacao         TEXT;

COMMENT ON COLUMN demands.demandante_nome            IS 'Nome do demandante extraído via OCR ou preenchido manualmente';
COMMENT ON COLUMN demands.demandante_cpf             IS 'CPF do demandante extraído via OCR ou preenchido manualmente';
COMMENT ON COLUMN demands.demandante_data_nascimento IS 'Data de nascimento do demandante (formato DD/MM/AAAA)';
COMMENT ON COLUMN demands.demandante_situacao        IS 'Situação do cidadão (ex: Aposentado, Empregado, Estudante)';
