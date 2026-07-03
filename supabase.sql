-- Execute este SQL no Supabase em SQL Editor.
-- Ele cria as tabelas, relacionamento e politicas RLS para gravacao sem login.

create extension if not exists pgcrypto;

create table if not exists public.trajetos (
  id uuid primary key default gen_random_uuid(),
  matricula_condutor text not null,
  cliente text not null,
  sentido text null,
  nome_linha text null,
  status text not null default 'em_andamento',
  data_hora_inicio timestamptz not null default now(),
  data_hora_fim timestamptz null,
  created_at timestamptz not null default now(),
  constraint trajetos_status_check check (status in ('em_andamento', 'finalizado'))
);

alter table public.trajetos
  add column if not exists sentido text null;

alter table public.trajetos
  add column if not exists nome_linha text null;

create table if not exists public.trajeto_pontos (
  id uuid primary key default gen_random_uuid(),
  trajeto_id uuid not null,
  latitude double precision not null,
  longitude double precision not null,
  data_hora_registro timestamptz not null default now(),
  ordem_ponto integer not null,
  created_at timestamptz not null default now(),
  constraint trajeto_pontos_trajeto_id_fkey
    foreign key (trajeto_id)
    references public.trajetos (id)
    on delete cascade,
  constraint trajeto_pontos_ordem_check check (ordem_ponto > 0),
  constraint trajeto_pontos_ordem_unique unique (trajeto_id, ordem_ponto)
);

create index if not exists idx_trajeto_pontos_trajeto_id
  on public.trajeto_pontos (trajeto_id);

create index if not exists idx_trajetos_status
  on public.trajetos (status);

create index if not exists idx_trajetos_matricula_condutor
  on public.trajetos (matricula_condutor);

create index if not exists idx_trajetos_cliente
  on public.trajetos (cliente);

create index if not exists idx_trajetos_sentido
  on public.trajetos (sentido);

create index if not exists idx_trajetos_nome_linha
  on public.trajetos (nome_linha);

create index if not exists idx_trajetos_inicio
  on public.trajetos (data_hora_inicio desc);

alter table public.trajetos enable row level security;
alter table public.trajeto_pontos enable row level security;

drop policy if exists "Permitir criar trajetos anonimamente" on public.trajetos;
create policy "Permitir criar trajetos anonimamente"
on public.trajetos
for insert
to anon
with check (
  status = 'em_andamento'
  and data_hora_fim is null
);

drop policy if exists "Permitir consultar trajetos anonimamente" on public.trajetos;
create policy "Permitir consultar trajetos anonimamente"
on public.trajetos
for select
to anon
using (true);

drop policy if exists "Permitir finalizar trajetos anonimamente" on public.trajetos;
create policy "Permitir finalizar trajetos anonimamente"
on public.trajetos
for update
to anon
using (status = 'em_andamento')
with check (
  status = 'finalizado'
  and data_hora_fim is not null
);

drop policy if exists "Permitir excluir trajetos anonimamente" on public.trajetos;
create policy "Permitir excluir trajetos anonimamente"
on public.trajetos
for delete
to anon
using (true);

drop policy if exists "Permitir criar pontos anonimamente" on public.trajeto_pontos;
create policy "Permitir criar pontos anonimamente"
on public.trajeto_pontos
for insert
to anon
with check (
  exists (
    select 1
    from public.trajetos t
    where t.id = trajeto_id
      and t.status = 'em_andamento'
  )
);

drop policy if exists "Permitir consultar pontos anonimamente" on public.trajeto_pontos;
create policy "Permitir consultar pontos anonimamente"
on public.trajeto_pontos
for select
to anon
using (true);

drop policy if exists "Permitir excluir pontos anonimamente" on public.trajeto_pontos;
create policy "Permitir excluir pontos anonimamente"
on public.trajeto_pontos
for delete
to anon
using (true);
