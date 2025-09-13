-- Cria tabela permissions (opcional) e profile_permissions

CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission text UNIQUE NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS public.profile_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil text NOT NULL,
  permission text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(perfil, permission)
);

-- Inserir permissões padrão
INSERT INTO public.permissions (permission, description)
VALUES
  ('process:criar', 'Permite criar processos'),
  ('process:ver', 'Permite visualizar processos'),
  ('process:finalizar', 'Permite finalizar processos'),
  ('relatorios:ver', 'Permite visualizar relatórios'),
  ('usuarios:gerenciar', 'Permite gerenciar usuários')
ON CONFLICT (permission) DO NOTHING;

-- Observação: execute este SQL com privilégios admin no Supabase.
