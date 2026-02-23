-- =========================================================================
-- RLS (Row Level Security) para: demands, demand_history, organs
-- Execute este script no SQL Editor do Supabase
-- =========================================================================

-- ─── 1. ORGANS ────────────────────────────────────────────────────────────────

ALTER TABLE public.organs ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode visualizar órgãos
CREATE POLICY "Autenticados podem ver órgãos"
  ON public.organs FOR SELECT
  TO authenticated
  USING (true);

-- Apenas administradores podem inserir órgãos
CREATE POLICY "Admins podem criar órgãos"
  ON public.organs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'administrador'
    )
  );

-- Apenas administradores podem atualizar órgãos
CREATE POLICY "Admins podem atualizar órgãos"
  ON public.organs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'administrador'
    )
  );

-- ─── 2. DEMANDS ──────────────────────────────────────────────────────────────

ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode visualizar demandas
CREATE POLICY "Autenticados podem ver demandas"
  ON public.demands FOR SELECT
  TO authenticated
  USING (true);

-- Usuários autenticados podem criar demandas
CREATE POLICY "Autenticados podem criar demandas"
  ON public.demands FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Usuários autenticados podem atualizar demandas (atribuir, encaminhar, mudar status)
CREATE POLICY "Autenticados podem atualizar demandas"
  ON public.demands FOR UPDATE
  TO authenticated
  USING (true);

-- ─── 3. DEMAND_HISTORY ──────────────────────────────────────────────────────

ALTER TABLE public.demand_history ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode visualizar histórico
CREATE POLICY "Autenticados podem ver histórico"
  ON public.demand_history FOR SELECT
  TO authenticated
  USING (true);

-- Usuários autenticados podem inserir histórico
CREATE POLICY "Autenticados podem inserir histórico"
  ON public.demand_history FOR INSERT
  TO authenticated
  WITH CHECK (true);
