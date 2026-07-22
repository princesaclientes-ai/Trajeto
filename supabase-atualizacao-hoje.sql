-- ATUALIZACAO CONSOLIDADA DO SUPABASE
-- Inclui todas as alteracoes solicitadas hoje:
-- 1. Status "importado" (Importacao concluida)
-- 2. Alteracao reversivel entre "trajeto" e "importado"
-- 3. Lixeira de trajetos por 30 dias
-- 4. Restauracao durante o periodo de retencao
-- 5. Exclusao definitiva dos trajetos vencidos e de seus pontos

begin;

-- Adiciona a data de envio para a lixeira.
alter table public.trajetos
  add column if not exists deleted_at timestamptz null;

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
to anon
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

commit;

-- Conferencia opcional depois da execucao:
select
  status,
  count(*) as quantidade
from public.trajetos
group by status
order by status;
