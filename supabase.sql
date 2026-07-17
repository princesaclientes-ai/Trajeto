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
  constraint trajetos_status_check check (status in ('em_andamento', 'finalizado', 'trajeto'))
);

alter table public.trajetos
  drop constraint if exists trajetos_status_check;

alter table public.trajetos
  add constraint trajetos_status_check
  check (status in ('em_andamento', 'finalizado', 'trajeto'));

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
  tipo_ponto text null,
  precisao double precision null,
  created_at timestamptz not null default now(),
  constraint trajeto_pontos_trajeto_id_fkey
    foreign key (trajeto_id)
    references public.trajetos (id)
    on delete cascade,
  constraint trajeto_pontos_ordem_check check (ordem_ponto > 0),
  constraint trajeto_pontos_ordem_unique unique (trajeto_id, ordem_ponto)
);

alter table public.trajeto_pontos
  add column if not exists tipo_ponto text null;

alter table public.trajeto_pontos
  add column if not exists precisao double precision null;

create index if not exists idx_trajeto_pontos_trajeto_id
  on public.trajeto_pontos (trajeto_id);

create index if not exists idx_trajeto_pontos_tipo_ponto
  on public.trajeto_pontos (tipo_ponto);

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

create table if not exists public.ajuda_perguntas (
  id uuid primary key default gen_random_uuid(),
  pergunta_original text not null,
  pergunta_normalizada text not null unique,
  pergunta_corrigida text null,
  resposta text null,
  status text not null default 'pendente',
  quantidade_perguntas integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ajuda_perguntas_status_check check (status in ('pendente', 'respondida'))
);

create index if not exists idx_ajuda_perguntas_status
  on public.ajuda_perguntas (status, created_at desc);

create table if not exists public.linhas_configuradas (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  sentido text not null,
  nome_linha text not null,
  created_at timestamptz not null default now(),
  constraint linhas_configuradas_unique unique (cliente, sentido, nome_linha)
);

create index if not exists idx_linhas_configuradas_cliente_sentido
  on public.linhas_configuradas (cliente, sentido);

alter table public.trajetos enable row level security;
alter table public.trajeto_pontos enable row level security;
alter table public.ajuda_perguntas enable row level security;
alter table public.linhas_configuradas enable row level security;

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
drop policy if exists "Permitir atualizar trajetos anonimamente" on public.trajetos;
create policy "Permitir atualizar trajetos anonimamente"
on public.trajetos
for update
to anon
using (status in ('em_andamento', 'finalizado', 'trajeto'))
with check (
  (
    status = 'em_andamento'
    and data_hora_fim is null
  )
  or (
    status in ('finalizado', 'trajeto')
    and data_hora_fim is not null
  )
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
      and t.status in ('em_andamento', 'finalizado', 'trajeto')
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

drop policy if exists "Permitir editar pontos anonimamente" on public.trajeto_pontos;
create policy "Permitir editar pontos anonimamente"
on public.trajeto_pontos
for update
to anon
using (true)
with check (
  exists (
    select 1
    from public.trajetos t
    where t.id = trajeto_id
  )
);

drop policy if exists "Permitir registrar perguntas da ajuda" on public.ajuda_perguntas;
create policy "Permitir registrar perguntas da ajuda"
on public.ajuda_perguntas
for insert
to anon
with check (
  status = 'pendente'
  and resposta is null
);

drop policy if exists "Permitir consultar perguntas da ajuda" on public.ajuda_perguntas;
create policy "Permitir consultar perguntas da ajuda"
on public.ajuda_perguntas
for select
to anon
using (true);

drop policy if exists "Permitir editar perguntas da ajuda" on public.ajuda_perguntas;
create policy "Permitir editar perguntas da ajuda"
on public.ajuda_perguntas
for update
to anon
using (true)
with check (
  status in ('pendente', 'respondida')
);

drop policy if exists "Permitir excluir perguntas da ajuda" on public.ajuda_perguntas;
create policy "Permitir excluir perguntas da ajuda"
on public.ajuda_perguntas
for delete
to anon
using (true);

drop policy if exists "Permitir consultar linhas configuradas" on public.linhas_configuradas;
create policy "Permitir consultar linhas configuradas"
on public.linhas_configuradas
for select
to anon, authenticated
using (true);

drop policy if exists "Permitir cadastrar linhas configuradas" on public.linhas_configuradas;
create policy "Permitir cadastrar linhas configuradas"
on public.linhas_configuradas
for insert
to anon, authenticated
with check (
  length(trim(cliente)) > 0
  and sentido in ('Entrada', 'Saída')
  and length(trim(nome_linha)) > 0
);

drop policy if exists "Permitir editar linhas configuradas" on public.linhas_configuradas;
create policy "Permitir editar linhas configuradas"
on public.linhas_configuradas
for update
to anon, authenticated
using (true)
with check (
  length(trim(cliente)) > 0
  and sentido in ('Entrada', 'Saída')
  and length(trim(nome_linha)) > 0
);

drop policy if exists "Permitir excluir linhas configuradas" on public.linhas_configuradas;
create policy "Permitir excluir linhas configuradas"
on public.linhas_configuradas
for delete
to anon, authenticated
using (true);

grant select, insert, update, delete
  on table public.linhas_configuradas
  to anon, authenticated;

-- Uso aproximado do banco para exibir no painel.
-- Ajuste o valor 5 * 1024 * 1024 * 1024 se o limite do seu plano for outro.
drop function if exists public.get_database_usage();

create or replace function public.get_database_usage()
returns table (
  used_bytes bigint,
  app_used_bytes bigint,
  limit_bytes bigint
)
language sql
security definer
set search_path = public
as $$
  select
    pg_database_size(current_database())::bigint as used_bytes,
    (
      pg_total_relation_size('public.trajetos'::regclass)
      + pg_total_relation_size('public.trajeto_pontos'::regclass)
      + pg_total_relation_size('public.ajuda_perguntas'::regclass)
      + pg_total_relation_size('public.linhas_configuradas'::regclass)
    )::bigint as app_used_bytes,
    (5::bigint * 1024 * 1024 * 1024) as limit_bytes;
$$;

grant execute on function public.get_database_usage() to anon, authenticated;
