-- Somente consulta: verifica todas as execuções, pontos e geometria da linha.
select t.id, t.cliente, t.nome_linha, t.sentido, t.status,
  t.created_at, t.deleted_at,
  (select count(*) from public.trajeto_pontos p where p.trajeto_id = t.id) as pontos_salvos,
  case when jsonb_typeof(t.geometria_validada) = 'array'
    then jsonb_array_length(t.geometria_validada) else 0 end as coordenadas_oficiais,
  (select min(p.ordem_ponto) from public.trajeto_pontos p where p.trajeto_id = t.id) as primeira_ordem,
  (select max(p.ordem_ponto) from public.trajeto_pontos p where p.trajeto_id = t.id) as ultima_ordem
from public.trajetos t
where t.nome_linha ilike '%Monte Mor%'
  and t.cliente ilike '%Greenbrier%'
order by t.created_at desc;
