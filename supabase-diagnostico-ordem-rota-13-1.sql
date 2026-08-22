-- Diagnóstico somente leitura: maiores saltos entre pontos consecutivos
-- da versão mais recente da linha 13.1 - Louveira / Karcher Vinhedo / Saída.

with rota as (
  select id
  from public.trajetos
  where cliente = 'Karcher Vinhedo'
    and sentido = 'Saída'
    and nome_linha = '13.1 - Louveira'
    and deleted_at is null
  order by created_at desc
  limit 1
), pontos as (
  select
    tp.*,
    lag(tp.id) over (order by tp.ordem_ponto) as id_anterior,
    lag(tp.ordem_ponto) over (order by tp.ordem_ponto) as ordem_anterior,
    lag(tp.tipo_ponto) over (order by tp.ordem_ponto) as tipo_anterior,
    lag(tp.latitude) over (order by tp.ordem_ponto) as latitude_anterior,
    lag(tp.longitude) over (order by tp.ordem_ponto) as longitude_anterior,
    lag(tp.data_hora_registro) over (order by tp.ordem_ponto) as horario_anterior
  from public.trajeto_pontos tp
  where tp.trajeto_id = (select id from rota)
), segmentos as (
  select
    ordem_anterior,
    ordem_ponto,
    tipo_anterior,
    tipo_ponto,
    horario_anterior,
    data_hora_registro,
    latitude_anterior,
    longitude_anterior,
    latitude,
    longitude,
    round((
      111320 * sqrt(
        power(latitude - latitude_anterior, 2)
        + power(
          (longitude - longitude_anterior)
          * cos(radians((latitude + latitude_anterior) / 2)),
          2
        )
      )
    )::numeric, 1) as distancia_metros
  from pontos
  where latitude_anterior is not null
)
select *
from segmentos
order by distancia_metros desc
limit 30;
