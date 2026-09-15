-- Executar após supabase-gerenciador-acessos.sql.
-- Cópia atômica: mantém a origem e não substitui linhas existentes.
-- Substitua todo o texto do SQL Editor e execute este arquivo inteiro, sem selecionar trechos.
begin;
alter table public.trajetos add column if not exists trajeto_origem_id uuid references public.trajetos(id) on delete set null;
alter table public.trajetos add column if not exists copiado_por uuid references auth.users(id) on delete set null;
alter table public.trajetos add column if not exists copia_horario_referencia timestamptz;

drop function if exists public.copy_official_route(uuid,text,date,time);
drop function if exists public.copy_official_route(uuid,text,date,time,text);
create or replace function public.copy_official_route(
  p_source_id uuid, p_target_line text, p_date date, p_time time, p_target_client text default null, p_geometry jsonb default null
) returns uuid
language plpgsql security definer set search_path = public
as $copy_route$
declare
  v_source public.trajetos%rowtype;
  v_id uuid;
  v_anchor timestamptz;
  v_shift interval;
  v_entry boolean;
  v_points jsonb;
  v_target_client text;
  v_geometry jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada. Entre novamente no painel para copiar a rota';
  end if;
  if public.app_has_permission('editar') is not true
     and public.app_has_permission('painel.editar') is not true then
    raise exception 'Seu perfil não possui permissão de edição no banco. Confira editar ou painel.editar no gerenciador de acessos';
  end if;
  select * into v_source from public.trajetos where id = p_source_id and deleted_at is null for share;
  if not found or public.app_can_access_company(v_source.cliente) is not true then
    raise exception 'Rota de origem indisponível';
  end if;
  if v_source.status not in ('trajeto', 'importado') then
    raise exception 'Escolha uma execução oficial ou importada';
  end if;
  v_geometry := v_source.geometria_validada;
  if v_geometry is null or jsonb_array_length(v_geometry) < 2 then
    v_geometry := p_geometry;
  end if;
  if v_geometry is null or jsonb_typeof(v_geometry) <> 'array' or jsonb_array_length(v_geometry) < 2 then
    raise exception 'Calcule a geometria a partir dos pontos da execução antes de copiar';
  end if;
  if p_date is null or p_time is null or nullif(trim(p_target_line), '') is null then
    raise exception 'Informe linha, data e horário';
  end if;
  v_target_client := coalesce(nullif(trim(p_target_client), ''), v_source.cliente);
  if public.app_can_access_company(v_target_client) is not true then
    raise exception 'Sem acesso ao cliente de destino';
  end if;
  if v_target_client = v_source.cliente and trim(p_target_line) = trim(v_source.nome_linha) then
    raise exception 'Selecione outra linha de destino';
  end if;
  if coalesce(lower(v_source.sentido), '') not in ('entrada', 'saída', 'saida') then
    raise exception 'Sentido da origem inválido';
  end if;
  -- Serializa cópias concorrentes para o mesmo destino.
  perform pg_advisory_xact_lock(hashtextextended(v_target_client || ':' || v_source.sentido || ':' || trim(p_target_line), 0));
  if exists (select 1 from public.trajetos where cliente = v_target_client
    and sentido = v_source.sentido and nome_linha = trim(p_target_line) and deleted_at is null) then
    raise exception 'A linha de destino já possui uma execução. A cópia não substitui execuções existentes';
  end if;
  select jsonb_agg(to_jsonb(p) order by p.ordem_ponto) into v_points
    from public.trajeto_pontos p where p.trajeto_id = p_source_id;
  if coalesce(jsonb_array_length(v_points), 0) < 2 then
    raise exception 'A origem precisa de pelo menos dois pontos';
  end if;
  v_entry := lower(v_source.sentido) = 'entrada';
  select (p->>'data_hora_registro')::timestamptz into v_anchor
    from jsonb_array_elements(v_points) p
    where p->>'tipo_ponto' in ('primeiro', 'manual')
    order by case when v_entry then -(p->>'ordem_ponto')::integer else (p->>'ordem_ponto')::integer end
    limit 1;
  if v_anchor is null then
    raise exception 'A origem não possui horário de parada válido';
  end if;
  v_shift := ((p_date + p_time) at time zone 'America/Sao_Paulo') - v_anchor;
  insert into public.trajetos (matricula_condutor, cliente, sentido, nome_linha, status,
    data_hora_inicio, data_hora_fim, geometria_validada, nos_validacao, trajeto_origem_id, copiado_por, copia_horario_referencia)
  values ('COPIA-OFICIAL', v_target_client, v_source.sentido, trim(p_target_line), 'trajeto',
    (v_points->0->>'data_hora_registro')::timestamptz + v_shift,
    (v_points->-1->>'data_hora_registro')::timestamptz + v_shift,
    v_geometry, v_source.nos_validacao, v_source.id, auth.uid(),
    ((p_date + p_time) at time zone 'America/Sao_Paulo')) returning id into v_id;
  insert into public.trajeto_pontos (trajeto_id, latitude, longitude, data_hora_registro, ordem_ponto, tipo_ponto, precisao)
  select v_id, (p->>'latitude')::double precision, (p->>'longitude')::double precision,
    (p->>'data_hora_registro')::timestamptz + v_shift, (p->>'ordem_ponto')::integer,
    p->>'tipo_ponto', (p->>'precisao')::double precision
    from jsonb_array_elements(v_points) p;
  return v_id;
end;
$copy_route$;
revoke all on function public.copy_official_route(uuid,text,date,time,text,jsonb) from public, anon;
grant execute on function public.copy_official_route(uuid,text,date,time,text,jsonb) to authenticated;

-- Preserva a referencia propria das copias ja existentes.
update public.trajetos t set copia_horario_referencia = (
  select p.data_hora_registro from public.trajeto_pontos p
  where p.trajeto_id = t.id and p.tipo_ponto in ('primeiro', 'manual')
  order by case when lower(t.sentido) = 'entrada' then -p.ordem_ponto else p.ordem_ponto end
  limit 1
) where t.trajeto_origem_id is not null and t.copia_horario_referencia is null;

create or replace function public.sync_official_route_copies(p_source_id uuid)
returns void language plpgsql security definer set search_path = public
as $sync_copies$
declare
  v_source public.trajetos%rowtype;
  v_target public.trajetos%rowtype;
  v_points jsonb;
  v_anchor timestamptz;
  v_reference timestamptz;
  v_shift interval;
begin
  if not exists (select 1 from public.trajetos where trajeto_origem_id = p_source_id and deleted_at is null) then return; end if;
  select * into v_source from public.trajetos where id = p_source_id and deleted_at is null;
  if not found or v_source.status not in ('trajeto', 'importado') then return; end if;
  select jsonb_agg(to_jsonb(p) order by p.ordem_ponto) into v_points
    from public.trajeto_pontos p where p.trajeto_id = p_source_id;
  if coalesce(jsonb_array_length(v_points), 0) < 2 then return; end if;
  select (p->>'data_hora_registro')::timestamptz into v_anchor
    from jsonb_array_elements(v_points) p
    where p->>'tipo_ponto' in ('primeiro', 'manual')
    order by case when lower(v_source.sentido) = 'entrada' then -(p->>'ordem_ponto')::integer else (p->>'ordem_ponto')::integer end
    limit 1;
  if v_anchor is null then return; end if;
  for v_target in select * from public.trajetos
    where trajeto_origem_id = p_source_id and deleted_at is null order by id for update
  loop
    v_reference := v_target.copia_horario_referencia;
    if v_reference is null then
      select p.data_hora_registro into v_reference from public.trajeto_pontos p
        where p.trajeto_id = v_target.id and p.tipo_ponto in ('primeiro', 'manual')
        order by case when lower(v_target.sentido) = 'entrada' then -p.ordem_ponto else p.ordem_ponto end limit 1;
    end if;
    if v_reference is null then raise exception 'Copia % sem horario proprio de referencia', v_target.id; end if;
    v_shift := v_reference - v_anchor;
    update public.trajetos set geometria_validada = v_source.geometria_validada,
      nos_validacao = v_source.nos_validacao, status = 'trajeto',
      copia_horario_referencia = v_reference,
      data_hora_inicio = (v_points->0->>'data_hora_registro')::timestamptz + v_shift,
      data_hora_fim = (v_points->-1->>'data_hora_registro')::timestamptz + v_shift
      where id = v_target.id;
    delete from public.trajeto_pontos where trajeto_id = v_target.id;
    insert into public.trajeto_pontos (trajeto_id, latitude, longitude, data_hora_registro, ordem_ponto, tipo_ponto, precisao)
    select v_target.id, (p->>'latitude')::double precision, (p->>'longitude')::double precision,
      (p->>'data_hora_registro')::timestamptz + v_shift, (p->>'ordem_ponto')::integer,
      p->>'tipo_ponto', (p->>'precisao')::double precision
      from jsonb_array_elements(v_points) p;
  end loop;
end;
$sync_copies$;
revoke all on function public.sync_official_route_copies(uuid) from public, anon, authenticated;

create or replace function public.queue_official_copy_sync()
returns trigger language plpgsql security definer set search_path = public
as $queue_sync$
declare
  v_id uuid;
  v_seen jsonb := coalesce(nullif(current_setting('trajeto.copy_sync_seen', true), ''), '[]')::jsonb;
begin
  if tg_table_name = 'trajeto_pontos' then
    if tg_op = 'DELETE' then v_id := old.trajeto_id; else v_id := new.trajeto_id; end if;
  else
    if new.geometria_validada is not distinct from old.geometria_validada
      and new.nos_validacao is not distinct from old.nos_validacao
      and new.status is not distinct from old.status then return null; end if;
    v_id := new.id;
  end if;
  -- Eventos diferidos usam o estado final da transacao e sincronizam uma vez por origem.
  if v_seen ? v_id::text then return null; end if;
  perform set_config('trajeto.copy_sync_seen', (v_seen || jsonb_build_array(v_id::text))::text, true);
  perform public.sync_official_route_copies(v_id);
  return null;
end;
$queue_sync$;
revoke all on function public.queue_official_copy_sync() from public, anon, authenticated;

drop trigger if exists sync_copies_after_points on public.trajeto_pontos;
create constraint trigger sync_copies_after_points
  after insert or update or delete on public.trajeto_pontos
  deferrable initially deferred for each row execute function public.queue_official_copy_sync();
drop trigger if exists sync_copies_after_geometry on public.trajetos;
create constraint trigger sync_copies_after_geometry
  after update on public.trajetos
  deferrable initially deferred for each row execute function public.queue_official_copy_sync();
commit;
