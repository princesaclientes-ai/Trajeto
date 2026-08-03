-- ============================================================
-- SIMULADOR DE ALTERACAO DE ITINERARIO COM VERSIONAMENTO
-- Execute todo este arquivo no SQL Editor do Supabase.
-- ============================================================

create table if not exists public.trajeto_versoes (
  id uuid primary key default gen_random_uuid(),
  trajeto_id uuid not null references public.trajetos(id) on delete cascade,
  numero_versao integer not null,
  geometria jsonb not null default '[]'::jsonb,
  nos jsonb not null default '[]'::jsonb,
  pontos jsonb not null default '[]'::jsonb,
  metricas jsonb not null default '{}'::jsonb,
  operador text not null,
  motivo text not null,
  quantidade_pontos_alterados integer not null default 0,
  versao_atual boolean not null default false,
  criada_em timestamptz not null default now(),
  unique (trajeto_id, numero_versao)
);

create index if not exists idx_trajeto_versoes_trajeto
  on public.trajeto_versoes (trajeto_id, numero_versao desc);

alter table public.trajeto_versoes enable row level security;

drop policy if exists "Permitir consultar versoes" on public.trajeto_versoes;
create policy "Permitir consultar versoes"
on public.trajeto_versoes for select
to anon, authenticated
using (true);

create or replace function public.officialize_route_version(
  p_trajeto_id uuid,
  p_geometry jsonb,
  p_nodes jsonb,
  p_points jsonb,
  p_operator text,
  p_reason text,
  p_previous_metrics jsonb default '{}'::jsonb,
  p_new_metrics jsonb default '{}'::jsonb
)
returns table(version_number integer, total_points integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_route public.trajetos%rowtype;
  v_current_points jsonb;
  v_next_version integer;
  v_previous_count integer;
  v_new_count integer;
begin
  if nullif(trim(p_operator), '') is null then
    raise exception 'Operador responsavel obrigatorio';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'Motivo da alteracao obrigatorio';
  end if;
  if jsonb_typeof(p_geometry) <> 'array' or jsonb_array_length(p_geometry) < 2 then
    raise exception 'Geometria da simulacao invalida';
  end if;
  if jsonb_typeof(p_points) <> 'array' or jsonb_array_length(p_points) < 2 then
    raise exception 'Pontos da simulacao invalidos';
  end if;

  select * into v_route
  from public.trajetos
  where id = p_trajeto_id and deleted_at is null
  for update;
  if not found then raise exception 'Trajeto nao encontrado'; end if;

  select coalesce(jsonb_agg(to_jsonb(point_row) order by point_row.ordem_ponto), '[]'::jsonb)
    into v_current_points
  from public.trajeto_pontos point_row
  where point_row.trajeto_id = p_trajeto_id;

  select count(*)::integer into v_previous_count
  from public.trajeto_pontos where trajeto_id = p_trajeto_id;
  v_new_count := jsonb_array_length(p_points);

  -- Registra a versao original na primeira oficializacao.
  if not exists (
    select 1 from public.trajeto_versoes where trajeto_id = p_trajeto_id
  ) then
    insert into public.trajeto_versoes (
      trajeto_id, numero_versao, geometria, nos, pontos, metricas,
      operador, motivo, quantidade_pontos_alterados, versao_atual
    ) values (
      p_trajeto_id, 1,
      coalesce(v_route.geometria_validada, '[]'::jsonb),
      coalesce(v_route.nos_validacao, '[]'::jsonb),
      v_current_points,
      coalesce(p_previous_metrics, '{}'::jsonb),
      trim(p_operator),
      'Versao original preservada antes da primeira simulacao',
      0,
      false
    );
  end if;

  update public.trajeto_versoes
  set versao_atual = false
  where trajeto_id = p_trajeto_id;

  select coalesce(max(numero_versao), 0) + 1
    into v_next_version
  from public.trajeto_versoes
  where trajeto_id = p_trajeto_id;

  insert into public.trajeto_versoes (
    trajeto_id, numero_versao, geometria, nos, pontos, metricas,
    operador, motivo, quantidade_pontos_alterados, versao_atual
  ) values (
    p_trajeto_id, v_next_version, p_geometry, coalesce(p_nodes, '[]'::jsonb),
    p_points, coalesce(p_new_metrics, '{}'::jsonb),
    trim(p_operator), trim(p_reason),
    coalesce(
      nullif(p_new_metrics ->> 'quantidade_pontos_alterados', '')::integer,
      abs(v_new_count - v_previous_count)
    ),
    true
  );

  update public.trajetos
  set geometria_validada = p_geometry,
      nos_validacao = coalesce(p_nodes, '[]'::jsonb),
      status = case when status = 'importado' then 'trajeto' else status end
  where id = p_trajeto_id;

  delete from public.trajeto_pontos where trajeto_id = p_trajeto_id;

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
  from jsonb_array_elements(p_points) with ordinality as item(value, ordinality);

  return query select v_next_version, v_new_count;
end;
$$;

revoke all on function public.officialize_route_version(
  uuid, jsonb, jsonb, jsonb, text, text, jsonb, jsonb
) from public;

grant execute on function public.officialize_route_version(
  uuid, jsonb, jsonb, jsonb, text, text, jsonb, jsonb
) to anon, authenticated;

create or replace function public.restore_route_version(
  p_version_id uuid,
  p_operator text,
  p_reason text
)
returns table(version_number integer, total_points integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version public.trajeto_versoes%rowtype;
  v_current_metrics jsonb;
begin
  select * into v_version
  from public.trajeto_versoes
  where id = p_version_id;
  if not found then raise exception 'Versao nao encontrada'; end if;

  select coalesce(metricas, '{}'::jsonb) into v_current_metrics
  from public.trajeto_versoes
  where trajeto_id = v_version.trajeto_id
    and versao_atual = true
  order by numero_versao desc
  limit 1;

  return query
  select *
  from public.officialize_route_version(
    v_version.trajeto_id,
    v_version.geometria,
    v_version.nos,
    v_version.pontos,
    p_operator,
    p_reason,
    coalesce(v_current_metrics, '{}'::jsonb),
    coalesce(v_version.metricas, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.restore_route_version(uuid, text, text) from public;
grant execute on function public.restore_route_version(uuid, text, text)
  to anon, authenticated;
