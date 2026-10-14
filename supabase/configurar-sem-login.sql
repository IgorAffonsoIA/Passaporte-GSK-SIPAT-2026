-- Execute este arquivo no SQL Editor do Supabase depois de criar a tabela.
-- O navegador não acessa a tabela diretamente: somente o servidor Next.js acessa.

drop policy if exists "Empregado visualiza o proprio passaporte"
  on public.passaportes;

drop policy if exists "Empregado cria o proprio passaporte"
  on public.passaportes;

alter table public.passaportes
  drop column if exists auth_user_id;

alter table public.passaportes
  enable row level security;

revoke all on table public.passaportes
  from anon, authenticated;

-- Projetos novos do Supabase não expõem tabelas automaticamente.
-- A chave secreta usada pelas rotas Next.js assume o papel service_role,
-- que ainda precisa receber privilégios SQL explícitos.
grant usage on schema public
  to service_role;

grant select, insert, update on table public.passaportes
  to service_role;

-- Normaliza e garante que cada e-mail tenha apenas um passaporte.
update public.passaportes
set email = lower(trim(email));

drop index if exists public.passaportes_email_unico;

create unique index passaportes_email_unico
  on public.passaportes (lower(email));
