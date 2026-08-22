-- Garante que usuários autenticados vejam somente os clientes autorizados
-- e recebam os pontos pertencentes aos trajetos desses mesmos clientes.
-- As políticas exclusivas da captura pública (role anon) são preservadas.

create or replace function public.app_can_access_company(p_empresa text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_usuarios u
    join public.app_perfis p on p.slug = u.perfil
    left join public.app_usuario_empresas e
      on e.user_id = u.user_id and lower(trim(e.empresa)) = lower(trim(p_empresa))
    left join public.app_perfil_empresas pe
      on pe.perfil_slug = p.slug and lower(trim(pe.empresa)) = lower(trim(p_empresa))
    where u.user_id = auth.uid()
      and u.ativo
      and (
        (u.empresas_customizadas and e.user_id is not null)
        or
        (not u.empresas_customizadas and (p.todas_empresas or pe.perfil_slug is not null))
      )
  )
$$;

grant execute on function public.app_can_access_company(text) to authenticated;
grant select on public.trajetos, public.trajeto_pontos to authenticated;

alter table public.trajetos enable row level security;
alter table public.trajeto_pontos enable row level security;

-- Remove somente políticas de leitura que também alcançam authenticated/public.
-- Políticas da role anon continuam intactas para as telas públicas de captura.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('trajetos', 'trajeto_pontos')
      and cmd in ('SELECT', 'ALL')
      and ('authenticated'::name = any(roles) or 'public'::name = any(roles))
  loop
    execute format('drop policy if exists %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end $$;

drop policy if exists "Usuario consulta trajetos permitidos" on public.trajetos;
create policy "Usuario consulta trajetos permitidos"
on public.trajetos
for select
to authenticated
using (public.app_can_access_company(cliente));

drop policy if exists "Usuario consulta pontos permitidos" on public.trajeto_pontos;
create policy "Usuario consulta pontos permitidos"
on public.trajeto_pontos
for select
to authenticated
using (
  exists (
    select 1
    from public.trajetos t
    where t.id = trajeto_id
      and public.app_can_access_company(t.cliente)
  )
);

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('trajetos', 'trajeto_pontos')
order by tablename, policyname;
