-- Execute este SQL no Supabase em SQL Editor.
-- Ele cria as tabelas, relacionamento e politicas RLS para gravacao sem login.

create extension if not exists pgcrypto;

create table if not exists public.operadores_planejamento (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.alinhamentos_execucao (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  sentido text not null default '',
  nome_linha text not null default '',
  apelido_condutor text not null,
  operador_id uuid not null references public.operadores_planejamento(id),
  operador_nome text not null,
  status text not null default 'alinhado' check (status = 'alinhado'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente, sentido, nome_linha)
);

alter table public.operadores_planejamento enable row level security;
alter table public.alinhamentos_execucao enable row level security;

drop policy if exists "Permitir consultar operadores anonimamente" on public.operadores_planejamento;
create policy "Permitir consultar operadores anonimamente"
on public.operadores_planejamento for select to anon using (true);
drop policy if exists "Permitir cadastrar operadores anonimamente" on public.operadores_planejamento;
create policy "Permitir cadastrar operadores anonimamente"
on public.operadores_planejamento for insert to anon with check (true);
drop policy if exists "Permitir atualizar operadores anonimamente" on public.operadores_planejamento;
create policy "Permitir atualizar operadores anonimamente"
on public.operadores_planejamento for update to anon using (true) with check (true);

drop policy if exists "Permitir consultar alinhamentos anonimamente" on public.alinhamentos_execucao;
create policy "Permitir consultar alinhamentos anonimamente"
on public.alinhamentos_execucao for select to anon using (true);
drop policy if exists "Permitir criar alinhamentos anonimamente" on public.alinhamentos_execucao;
create policy "Permitir criar alinhamentos anonimamente"
on public.alinhamentos_execucao for insert to anon with check (status = 'alinhado');
drop policy if exists "Permitir atualizar alinhamentos anonimamente" on public.alinhamentos_execucao;
create policy "Permitir atualizar alinhamentos anonimamente"
on public.alinhamentos_execucao for update to anon using (true) with check (status = 'alinhado');

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
  deleted_at timestamptz null,
  geometria_validada jsonb null,
  nos_validacao jsonb not null default '[]'::jsonb,
  constraint trajetos_status_check check (status in ('em_andamento', 'finalizado', 'importado', 'trajeto'))
);

alter table public.trajetos
  drop constraint if exists trajetos_status_check;

alter table public.trajetos
  add constraint trajetos_status_check
  check (status in ('em_andamento', 'finalizado', 'importado', 'trajeto'));

alter table public.trajetos
  add column if not exists sentido text null;

alter table public.trajetos
  add column if not exists nome_linha text null;

alter table public.trajetos
  add column if not exists deleted_at timestamptz null;

alter table public.trajetos
  add column if not exists geometria_validada jsonb null;

alter table public.trajetos
  add column if not exists nos_validacao jsonb not null default '[]'::jsonb;

create or replace function public.save_official_route_geometry(
  p_trajeto_id uuid,
  p_geometry jsonb,
  p_nodes jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if jsonb_typeof(p_geometry) <> 'array'
     or jsonb_array_length(p_geometry) < 2 then
    raise exception 'Geometria oficial invalida';
  end if;

  if p_nodes is not null and jsonb_typeof(p_nodes) <> 'array' then
    raise exception 'Nos de validacao invalidos';
  end if;

  update public.trajetos
  set
    geometria_validada = p_geometry,
    nos_validacao = coalesce(p_nodes, '[]'::jsonb),
    status = case
      when status = 'importado' then 'trajeto'
      else status
    end
  where id = p_trajeto_id
    and deleted_at is null
    and status in ('trajeto', 'importado');

  if not found then
    raise exception 'Trajeto nao encontrado ou ainda nao validado';
  end if;

  return true;
end;
$$;

revoke all on function public.save_official_route_geometry(uuid, jsonb, jsonb) from public;
grant execute on function public.save_official_route_geometry(uuid, jsonb, jsonb)
  to anon, authenticated;

create or replace function public.replace_automatic_route_points(
  p_trajeto_id uuid,
  p_points jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  total_points integer;
begin
  if jsonb_typeof(p_points) <> 'array'
     or jsonb_array_length(p_points) < 2 then
    raise exception 'Posicionamentos oficiais invalidos';
  end if;

  update public.trajeto_pontos
  set ordem_ponto = ordem_ponto + 1000000
  where trajeto_id = p_trajeto_id
    and tipo_ponto in ('primeiro', 'manual');

  delete from public.trajeto_pontos
  where trajeto_id = p_trajeto_id
    and coalesce(tipo_ponto, 'trajeto') not in ('primeiro', 'manual');

  insert into public.trajeto_pontos (
    trajeto_id, latitude, longitude, data_hora_registro,
    ordem_ponto, tipo_ponto, precisao
  )
  select
    p_trajeto_id,
    (item.value ->> 'latitude')::double precision,
    (item.value ->> 'longitude')::double precision,
    coalesce(nullif(item.value ->> 'data_hora_registro', '')::timestamptz, now()),
    item.ordinality::integer,
    'trajeto',
    nullif(item.value ->> 'precisao', '')::double precision
  from jsonb_array_elements(p_points) with ordinality as item(value, ordinality)
  where coalesce(item.value ->> 'tipo_ponto', 'trajeto') = 'trajeto';

  update public.trajeto_pontos saved_point
  set ordem_ponto = payload.ordinality::integer
  from jsonb_array_elements(p_points) with ordinality as payload(value, ordinality)
  where saved_point.trajeto_id = p_trajeto_id
    and saved_point.tipo_ponto in ('primeiro', 'manual')
    and payload.value ? 'id'
    and saved_point.id = (payload.value ->> 'id')::uuid;

  select count(*)::integer into total_points
  from public.trajeto_pontos
  where trajeto_id = p_trajeto_id;

  return total_points;
end;
$$;

revoke all on function public.replace_automatic_route_points(uuid, jsonb) from public;
grant execute on function public.replace_automatic_route_points(uuid, jsonb)
  to anon, authenticated;

create index if not exists idx_trajetos_deleted_at
  on public.trajetos (deleted_at);

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
using (status in ('em_andamento', 'finalizado', 'importado', 'trajeto'))
with check (
  (
    status = 'em_andamento'
    and data_hora_fim is null
  )
  or (
    status in ('finalizado', 'importado', 'trajeto')
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
to anon, authenticated
with check (
  exists (
    select 1
    from public.trajetos t
    where t.id = trajeto_id
      and t.status in ('em_andamento', 'finalizado', 'importado', 'trajeto')
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

-- Remove definitivamente trajetos que estão na lixeira há mais de 30 dias.
-- Os pontos são removidos junto pelo ON DELETE CASCADE.
create or replace function public.purge_expired_trash()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.trajetos
  where deleted_at is not null
    and deleted_at <= now() - interval '30 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.purge_expired_trash() to anon, authenticated;

drop function if exists public.officialize_route_geometry(uuid, jsonb, jsonb);

create or replace function public.officialize_route_geometry(
  p_trajeto_id uuid,
  p_geometry jsonb,
  p_points jsonb,
  p_nodes jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if jsonb_typeof(p_geometry) <> 'array'
     or jsonb_array_length(p_geometry) < 2 then
    raise exception 'Geometria oficial invalida';
  end if;

  if jsonb_typeof(p_points) <> 'array'
     or jsonb_array_length(p_points) < 2 then
    raise exception 'Posicionamentos oficiais invalidos';
  end if;

  update public.trajetos
  set geometria_validada = p_geometry,
      nos_validacao = coalesce(p_nodes, '[]'::jsonb)
  where id = p_trajeto_id
    and deleted_at is null
    and status in ('trajeto', 'importado');

  if not found then
    raise exception 'Trajeto nao encontrado ou ainda nao validado';
  end if;

  update public.trajeto_pontos saved_point
  set
    ordem_ponto = saved_point.ordem_ponto + 1000000,
    tipo_ponto = case
      when payload.value ->> 'tipo_ponto' = 'primeiro' then 'primeiro'
      else 'manual'
    end
  from jsonb_array_elements(p_points) as payload(value)
  where saved_point.trajeto_id = p_trajeto_id
    and payload.value ? 'id'
    and payload.value ->> 'tipo_ponto' in ('primeiro', 'manual')
    and saved_point.id = (payload.value ->> 'id')::uuid;

  delete from public.trajeto_pontos
  where trajeto_id = p_trajeto_id
    and coalesce(tipo_ponto, 'trajeto') not in ('primeiro', 'manual')
    and not exists (
      select 1
      from jsonb_array_elements(p_points) as protected(value)
      where protected.value ? 'id'
        and protected.value ->> 'tipo_ponto' in ('primeiro', 'manual')
        and public.trajeto_pontos.id = (protected.value ->> 'id')::uuid
    );

  insert into public.trajeto_pontos (
    trajeto_id, latitude, longitude, data_hora_registro,
    ordem_ponto, tipo_ponto, precisao
  )
  select
    p_trajeto_id,
    (item.value ->> 'latitude')::double precision,
    (item.value ->> 'longitude')::double precision,
    coalesce(nullif(item.value ->> 'data_hora_registro', '')::timestamptz, now()),
    item.ordinality::integer,
    coalesce(nullif(item.value ->> 'tipo_ponto', ''), 'trajeto'),
    nullif(item.value ->> 'precisao', '')::double precision
  from jsonb_array_elements(p_points) with ordinality as item(value, ordinality)
  where coalesce(item.value ->> 'tipo_ponto', 'trajeto') = 'trajeto';

  update public.trajeto_pontos saved_point
  set ordem_ponto = payload.ordinality::integer
  from jsonb_array_elements(p_points) with ordinality as payload(value, ordinality)
  where saved_point.trajeto_id = p_trajeto_id
    and saved_point.tipo_ponto in ('primeiro', 'manual')
    and payload.value ? 'id'
    and saved_point.id = (payload.value ->> 'id')::uuid;

  select count(*)::integer
  into inserted_count
  from public.trajeto_pontos
  where trajeto_id = p_trajeto_id;
  return inserted_count;
end;
$$;

revoke all on function public.officialize_route_geometry(uuid, jsonb, jsonb, jsonb) from public;
grant execute on function public.officialize_route_geometry(uuid, jsonb, jsonb, jsonb)
  to anon, authenticated;
