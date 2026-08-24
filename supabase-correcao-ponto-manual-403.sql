-- Corrige o erro 403 ao adicionar pontos pelo painel.
-- Execute este arquivo uma vez no SQL Editor do projeto Supabase.

grant select, insert, update, delete
on table public.trajeto_pontos
to anon, authenticated;

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

drop policy if exists "Permitir consultar pontos anonimamente"
  on public.trajeto_pontos;

create policy "Permitir consultar pontos anonimamente"
on public.trajeto_pontos
for select
to anon, authenticated
using (true);

drop policy if exists "Permitir editar pontos anonimamente"
  on public.trajeto_pontos;

create policy "Permitir editar pontos anonimamente"
on public.trajeto_pontos
for update
to anon, authenticated
using (true)
with check (
  exists (
    select 1
    from public.trajetos t
    where t.id = trajeto_id
      and t.deleted_at is null
  )
);
