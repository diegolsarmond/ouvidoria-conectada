-- =========================================================================
-- MIGRAÇÃO: Vincular public.users com auth.users do Supabase
-- Execute este script no SQL Editor do Supabase
-- =========================================================================

-- 1. Adicionar a Foreign Key de public.users.id → auth.users.id
--    (Caso a tabela já exista e precise apenas adicionar o vínculo)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Habilitar RLS (Row Level Security) na tabela users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Política: Permitir SELECT para usuários autenticados
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os perfis" ON public.users;
CREATE POLICY "Usuários autenticados podem ver todos os perfis"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- 4. Política: Permitir INSERT para service_role (cadastro via backend)
--    e para o próprio usuário (self-registration), ou para admins
DROP POLICY IF EXISTS "Usuário pode inserir seu próprio perfil" ON public.users;
DROP POLICY IF EXISTS "Usuário pode inserir seu próprio perfil ou admin pode inserir qualquer" ON public.users;
CREATE POLICY "Usuário pode inserir seu próprio perfil ou admin pode inserir qualquer"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'administrador'
    )
  );

-- 5. Política: Permitir UPDATE para o próprio usuário ou para admins
DROP POLICY IF EXISTS "Usuário pode atualizar seu perfil ou admin pode atualizar qualquer" ON public.users;
CREATE POLICY "Usuário pode atualizar seu perfil ou admin pode atualizar qualquer"
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'administrador'
    )
  );

-- 6. Política: Permitir acesso anônimo para leitura (necessário para signup)
DROP POLICY IF EXISTS "Anônimo pode inserir perfil durante cadastro" ON public.users;
CREATE POLICY "Anônimo pode inserir perfil durante cadastro"
  ON public.users FOR INSERT
  TO anon
  WITH CHECK (true);

-- 7. Repetir RLS para user_organs
ALTER TABLE public.user_organs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados podem ver vínculos" ON public.user_organs;
CREATE POLICY "Autenticados podem ver vínculos"
  ON public.user_organs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Autenticados podem gerenciar vínculos" ON public.user_organs;
CREATE POLICY "Autenticados podem gerenciar vínculos"
  ON public.user_organs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir insert anônimo em user_organs também (caso necessário no signup)
DROP POLICY IF EXISTS "Anônimo pode inserir vínculos" ON public.user_organs;
CREATE POLICY "Anônimo pode inserir vínculos"
  ON public.user_organs FOR INSERT
  TO anon
  WITH CHECK (true);
