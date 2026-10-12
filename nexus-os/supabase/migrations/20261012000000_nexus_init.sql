-- NEXUS OS · esquema inicial (Fase 3)
-- Regra: cada usuário só enxerga e altera as próprias linhas (Row Level Security).
-- O navegador usa apenas a chave anon; nenhuma chave service_role sai do servidor.

-- Perfis --------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "perfis: ler o próprio" on public.profiles
  for select using ((select auth.uid()) = id);
create policy "perfis: criar o próprio" on public.profiles
  for insert with check ((select auth.uid()) = id);
create policy "perfis: editar o próprio" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Preferências (Settings) --------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_settings_tamanho check (pg_column_size(data) < 16384)
);

alter table public.user_settings enable row level security;

create policy "settings: ler as próprias" on public.user_settings
  for select using ((select auth.uid()) = user_id);
create policy "settings: criar as próprias" on public.user_settings
  for insert with check ((select auth.uid()) = user_id);
create policy "settings: editar as próprias" on public.user_settings
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "settings: apagar as próprias" on public.user_settings
  for delete using ((select auth.uid()) = user_id);

-- Arquivos do VFS na nuvem (bucket privado; sincronização entra depois) ------
-- Convenção de caminho: <user_id>/<caminho no VFS>
insert into storage.buckets (id, name, public, file_size_limit)
values ('vfs', 'vfs', false, 52428800)
on conflict (id) do nothing;

create policy "vfs: ler os próprios" on storage.objects
  for select using (bucket_id = 'vfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vfs: enviar os próprios" on storage.objects
  for insert with check (bucket_id = 'vfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vfs: atualizar os próprios" on storage.objects
  for update using (bucket_id = 'vfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vfs: apagar os próprios" on storage.objects
  for delete using (bucket_id = 'vfs' and (storage.foldername(name))[1] = (select auth.uid())::text);
