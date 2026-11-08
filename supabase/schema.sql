-- Rotina — tabela de sincronia. Rodar uma vez no Supabase: SQL Editor → New query → colar tudo → Run.
-- Pode rodar de novo sem problema (tudo é "if not exists" / "or replace").
-- Cada registro do app vira uma linha. Só o dono (auth.uid()) lê e escreve as próprias linhas.

create table if not exists public.rotina_registros (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  colecao     text        not null,
  id          text        not null,
  dados       jsonb       not null,
  alterado_em bigint      not null,              -- _m do app (ms): decide quem vence
  servidor_em timestamptz not null default clock_timestamp(), -- usado para baixar só o que mudou
  primary key (user_id, colecao, id)
);

create index if not exists rotina_registros_pull on public.rotina_registros (user_id, servidor_em);

-- Nunca deixa uma versão mais antiga sobrescrever uma mais nova (dois aparelhos editando).
-- SECURITY INVOKER (padrão): a função não ganha privilégio nenhum, só compara dois números.
create or replace function public.rotina_registros_lww() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.alterado_em <= old.alterado_em then
    return null; -- ignora a escrita
  end if;
  new.servidor_em := clock_timestamp();
  return new;
end $$;

drop trigger if exists rotina_registros_lww on public.rotina_registros;
create trigger rotina_registros_lww
  before insert or update on public.rotina_registros
  for each row execute function public.rotina_registros_lww();

-- RLS sempre ligada: sem política, ninguém lê nada.
alter table public.rotina_registros enable row level security;

drop policy if exists "dono lê" on public.rotina_registros;
drop policy if exists "dono insere" on public.rotina_registros;
drop policy if exists "dono altera" on public.rotina_registros;
create policy "dono lê"     on public.rotina_registros for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "dono insere" on public.rotina_registros for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "dono altera" on public.rotina_registros for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Acesso pela API de dados: só quem fez login. Sem DELETE (o app apaga com "lápide") e nada para anônimos.
revoke all on public.rotina_registros from anon;
grant select, insert, update on public.rotina_registros to authenticated;
