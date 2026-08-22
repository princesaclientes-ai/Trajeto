-- Corrige a visibilidade de usuários para o Master e demais administradores.
-- Pode ser executado novamente sem duplicar registros.

create or replace function public.app_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      u.ativo
      and (
        lower(u.usuario) = 'master'
        or coalesce(u.permissoes_customizadas, p.permissoes, '[]'::jsonb)
          ? 'gerenciador.gerenciar'
      )
    from public.app_usuarios u
    left join public.app_perfis p on p.slug = u.perfil
    where u.user_id = auth.uid()
  ), false)
$$;

grant execute on function public.app_is_admin() to authenticated;

drop policy if exists "Usuario consulta proprio perfil" on public.app_usuarios;
create policy "Usuario consulta proprio perfil"
on public.app_usuarios
for select
to authenticated
using (user_id = auth.uid() or public.app_is_admin());

drop policy if exists "Administrador gerencia usuarios" on public.app_usuarios;
create policy "Administrador gerencia usuarios"
on public.app_usuarios
for all
to authenticated
using (public.app_is_admin())
with check (public.app_is_admin());

select user_id, nome, usuario, perfil, ativo
from public.app_usuarios
order by nome;
