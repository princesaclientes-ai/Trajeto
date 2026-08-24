-- ATUALIZACAO CONSOLIDADA DO SUPABASE
-- Inclui todas as alteracoes solicitadas hoje:
-- 1. Status "importado" (Importacao concluida)
-- 2. Alteracao reversivel entre "trajeto" e "importado"
-- 3. Lixeira de trajetos por 30 dias
-- 4. Restauracao durante o periodo de retencao
-- 5. Exclusao definitiva dos trajetos vencidos e de seus pontos

begin;

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
  status text not null default 'alinhado'
    check (status = 'alinhado'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente, sentido, nome_linha)
);

create table if not exists public.demanda_historico (
  id uuid primary key default gen_random_uuid(),
  trajeto_id uuid null references public.trajetos(id) on delete set null,
  cliente text not null,
  sentido text not null default '',
  nome_linha text not null default '',
  status text not null,
  operador_id uuid not null references public.operadores_planejamento(id),
  operador_nome text not null,
  apelido_condutor text null,
  detalhes text null,
  created_at timestamptz not null default now()
);

alter table public.demanda_historico enable row level security;
drop policy if exists "Permitir consultar historico de demandas" on public.demanda_historico;
create policy "Permitir consultar historico de demandas"
on public.demanda_historico for select to anon, authenticated using (true);
drop policy if exists "Permitir registrar historico de demandas" on public.demanda_historico;
create policy "Permitir registrar historico de demandas"
on public.demanda_historico for insert to anon, authenticated with check (true);
grant select, insert on public.demanda_historico to anon, authenticated;

alter table public.operadores_planejamento enable row level security;
alter table public.alinhamentos_execucao enable row level security;

drop policy if exists "Permitir consultar operadores anonimamente"
  on public.operadores_planejamento;
create policy "Permitir consultar operadores anonimamente"
on public.operadores_planejamento for select to anon using (true);

drop policy if exists "Permitir cadastrar operadores anonimamente"
  on public.operadores_planejamento;
create policy "Permitir cadastrar operadores anonimamente"
on public.operadores_planejamento for insert to anon with check (true);

drop policy if exists "Permitir atualizar operadores anonimamente"
  on public.operadores_planejamento;
create policy "Permitir atualizar operadores anonimamente"
on public.operadores_planejamento for update to anon using (true) with check (true);

drop policy if exists "Permitir consultar alinhamentos anonimamente"
  on public.alinhamentos_execucao;
create policy "Permitir consultar alinhamentos anonimamente"
on public.alinhamentos_execucao for select to anon using (true);

drop policy if exists "Permitir criar alinhamentos anonimamente"
  on public.alinhamentos_execucao;
create policy "Permitir criar alinhamentos anonimamente"
on public.alinhamentos_execucao for insert to anon with check (status = 'alinhado');

drop policy if exists "Permitir atualizar alinhamentos anonimamente"
  on public.alinhamentos_execucao;
create policy "Permitir atualizar alinhamentos anonimamente"
on public.alinhamentos_execucao for update to anon using (true)
with check (status = 'alinhado');

-- Adiciona a data de envio para a lixeira.
alter table public.trajetos
  add column if not exists deleted_at timestamptz null;

alter table public.trajetos
  add column if not exists geometria_validada jsonb null;

alter table public.trajetos
  add column if not exists nos_validacao jsonb not null default '[]'::jsonb;

-- Salva somente a camada oficial e seus nos. Esta funcao nao altera,
-- exclui ou recria qualquer registro de trajeto_pontos.
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

-- Substitui somente os posicionamentos automaticos. Pontos manual e
-- primeiro permanecem com os mesmos IDs e dados.
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

  if not exists (
    select 1 from public.trajetos
    where id = p_trajeto_id
      and deleted_at is null
      and status in ('trajeto', 'importado')
  ) then
    raise exception 'Trajeto nao encontrado ou ainda nao validado';
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

-- Permite localizar rapidamente registros ativos e registros da lixeira.
create index if not exists idx_trajetos_deleted_at
  on public.trajetos (deleted_at);

-- Adiciona o status "importado" aos status aceitos pelo banco.
alter table public.trajetos
  drop constraint if exists trajetos_status_check;

alter table public.trajetos
  add constraint trajetos_status_check
  check (
    status in (
      'em_andamento',
      'finalizado',
      'importado',
      'trajeto'
    )
  );

-- Mantem a criacao inicial dos trajetos como "em andamento".
drop policy if exists "Permitir criar trajetos anonimamente"
  on public.trajetos;

create policy "Permitir criar trajetos anonimamente"
on public.trajetos
for insert
to anon
with check (
  status = 'em_andamento'
  and data_hora_fim is null
  and deleted_at is null
);

-- Permite finalizar, importar, validar, desfazer a validacao,
-- enviar para a lixeira e restaurar um trajeto.
drop policy if exists "Permitir finalizar trajetos anonimamente"
  on public.trajetos;

drop policy if exists "Permitir atualizar trajetos anonimamente"
  on public.trajetos;

create policy "Permitir atualizar trajetos anonimamente"
on public.trajetos
for update
to anon
using (
  status in (
    'em_andamento',
    'finalizado',
    'importado',
    'trajeto'
  )
)
with check (
  (
    status = 'em_andamento'
    and data_hora_fim is null
  )
  or
  (
    status in (
      'finalizado',
      'importado',
      'trajeto'
    )
    and data_hora_fim is not null
  )
);

-- Permite inserir pontos enquanto o trajeto estiver em qualquer
-- um dos status validos, inclusive "importado".
drop policy if exists "Permitir criar pontos anonimamente"
  on public.trajeto_pontos;

create policy "Permitir criar pontos anonimamente"
on public.trajeto_pontos
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.trajetos t
    where t.id = trajeto_id
      and t.deleted_at is null
      and t.status in (
        'em_andamento',
        'finalizado',
        'importado',
        'trajeto'
      )
  )
);

-- Limpa definitivamente a lixeira depois de 30 dias.
-- A foreign key de trajeto_pontos usa ON DELETE CASCADE,
-- portanto os pontos do trajeto tambem sao apagados.
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

revoke all on function public.purge_expired_trash() from public;
grant execute on function public.purge_expired_trash() to anon, authenticated;

-- Oficializa a camada e substitui atomicamente os posicionamentos antigos.
-- O painel envia os pontos manuais preservados e os novos pontos de trajeto
-- recriados sobre a geometria oficial a cada 20 metros.
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

  -- Afasta temporariamente as ordens dos pontos permanentes para liberar
  -- a numeracao. Eles nunca sao excluidos durante a oficializacao.
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

  -- Remove somente posicionamentos automaticos e nos antigos.
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
    trajeto_id,
    latitude,
    longitude,
    data_hora_registro,
    ordem_ponto,
    tipo_ponto,
    precisao
  )
  select
    p_trajeto_id,
    (item.value ->> 'latitude')::double precision,
    (item.value ->> 'longitude')::double precision,
    coalesce(
      nullif(item.value ->> 'data_hora_registro', '')::timestamptz,
      now()
    ),
    item.ordinality::integer,
    coalesce(nullif(item.value ->> 'tipo_ponto', ''), 'trajeto'),
    nullif(item.value ->> 'precisao', '')::double precision
  from jsonb_array_elements(p_points) with ordinality as item(value, ordinality)
  where coalesce(item.value ->> 'tipo_ponto', 'trajeto') = 'trajeto';

  -- Recoloca os pontos permanentes nas posicoes enviadas pelo painel,
  -- preservando o mesmo ID e todos os seus dados originais.
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

commit;

-- Conferencia opcional depois da execucao:
select
  status,
  count(*) as quantidade
from public.trajetos
group by status
order by status;
