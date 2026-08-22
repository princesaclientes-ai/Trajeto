-- Reparo seguro do login e das colunas de personalização.
-- Pode ser executado mais de uma vez. Não apaga usuários nem trajetos.

alter table public.app_usuarios add column if not exists usuario text;
alter table public.app_usuarios add column if not exists permissoes_customizadas jsonb null;
alter table public.app_usuarios add column if not exists empresas_customizadas boolean not null default false;
alter table public.app_usuarios drop constraint if exists app_usuarios_perfil_check;
update public.app_usuarios set perfil = 'geral' where perfil = 'administrador';
update public.app_usuarios set perfil = 'pesquisa' where perfil = 'visualizador';

update public.app_usuarios
set usuario = lower(split_part(email, '@', 1))
where usuario is null and email is not null;

create table if not exists public.app_perfis (
  slug text primary key,
  nome text not null unique,
  permissoes jsonb not null default '[]'::jsonb,
  todas_empresas boolean not null default false,
  perfil_sistema boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_perfis (slug, nome, permissoes, todas_empresas, perfil_sistema) values
('pesquisa', 'Pesquisa', '["painel.pesquisar","consolidado.pesquisar"]', false, true),
('nivel_1', 'Nível 1', '["painel.pesquisar","painel.editar","consolidado.pesquisar","consolidado.editar"]', false, true),
('geral', 'Geral', '["painel.pesquisar","painel.editar","painel.excluir","painel.importar","painel.exportar","consolidado.pesquisar","consolidado.editar","consolidado.excluir","gerenciador.gerenciar","gerenciador.logs"]', true, true)
on conflict (slug) do update set
  nome = excluded.nome,
  permissoes = excluded.permissoes,
  todas_empresas = excluded.todas_empresas,
  perfil_sistema = true,
  updated_at = now();

create table if not exists public.app_perfil_empresas (
  perfil_slug text not null references public.app_perfis(slug) on update cascade on delete cascade,
  empresa text not null,
  created_at timestamptz not null default now(),
  primary key (perfil_slug, empresa)
);

update public.app_usuarios
set nome = 'Master', usuario = 'master', perfil = 'geral', ativo = true
where email = 'master@acesso.trajetocaptura.com.br';

create or replace function public.app_has_permission(p_permission text)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((
    select u.ativo and coalesce(u.permissoes_customizadas, p.permissoes) ? p_permission
    from public.app_usuarios u
    join public.app_perfis p on p.slug = u.perfil
    where u.user_id = auth.uid()
  ), false)
$$;

grant select on public.app_usuarios, public.app_perfis, public.app_perfil_empresas to authenticated;
grant execute on function public.app_has_permission(text) to authenticated;

select user_id, nome, usuario, perfil, ativo
from public.app_usuarios
where usuario = 'master';
