-- Somente leitura. Execute no SQL Editor do Supabase para verificar
-- 2B - Nova Odessa e 2B.1 - Nova Odessa 22:30h.
-- Retorna todas as execucoes correspondentes, separadas por cliente e sentido.
select t.id, t.cliente, t.sentido, t.nome_linha, t.status,
  to_jsonb(t)->>'trajeto_origem_id' as origem_id,
  o.nome_linha as linha_de_origem, o.cliente as cliente_de_origem,
  to_jsonb(t)->>'copia_horario_referencia' as horario_proprio,
  (select count(*) from public.trajeto_pontos p where p.trajeto_id=t.id) as pontos,
  case
    when to_jsonb(t)->>'trajeto_origem_id' is null then 'Sem vinculo de copia'
    when o.id is null or o.deleted_at is not null then 'Origem indisponivel'
    when o.status not in ('trajeto','importado') then 'Origem ainda nao oficializada'
    when t.geometria_validada is distinct from o.geometria_validada then 'Geometria diferente da origem'
    else 'Vinculo presente; conferir pontos e gatilhos'
  end as diagnostico
from public.trajetos t
left join public.trajetos o on o.id::text = to_jsonb(t)->>'trajeto_origem_id'
where t.deleted_at is null and t.nome_linha ilike '%Nova Odessa%'
  and (t.nome_linha ilike '2B -%' or t.nome_linha ilike '2B.1 -%')
order by t.cliente, t.sentido, t.nome_linha, t.data_hora_inicio;

-- Devem aparecer dois gatilhos habilitados (O = habilitado normalmente).
select c.relname as tabela, g.tgname as gatilho, g.tgenabled as habilitado
from pg_trigger g join pg_class c on c.oid=g.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and g.tgname in ('sync_copies_after_points','sync_copies_after_geometry');
