-- Execute no SQL Editor do Supabase uma vez.
-- index.html e index2.html continuam usando a role anon e permanecem públicos.

create table if not exists public.app_usuarios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  usuario text not null unique,
  email text null,
  perfil text not null default 'pesquisa' check (perfil in ('pesquisa', 'nivel_1', 'geral')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_usuario_empresas (
  user_id uuid not null references public.app_usuarios(user_id) on delete cascade,
  empresa text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, empresa)
);

create table if not exists public.app_perfis (
  slug text primary key,
  nome text not null unique,
  permissoes jsonb not null default '[]'::jsonb,
  todas_empresas boolean not null default false,
  perfil_sistema boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_perfis_permissoes_array check (jsonb_typeof(permissoes) = 'array')
);

create table if not exists public.app_perfil_empresas (
  perfil_slug text not null references public.app_perfis(slug) on update cascade on delete cascade,
  empresa text not null,
  created_at timestamptz not null default now(),
  primary key (perfil_slug, empresa)
);

create table if not exists public.app_logs (
  id bigint generated always as identity primary key,
  user_id uuid null references auth.users(id) on delete set null,
  email text null,
  empresa text null,
  acao text not null,
  recurso text null,
  recurso_id text null,
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_logs_created_at on public.app_logs(created_at desc);
create index if not exists idx_app_logs_empresa on public.app_logs(empresa);
create index if not exists idx_app_usuario_empresas_empresa on public.app_usuario_empresas(empresa);

alter table public.app_usuarios add column if not exists usuario text;
alter table public.app_usuarios add column if not exists permissoes_customizadas jsonb null;
alter table public.app_usuarios add column if not exists empresas_customizadas boolean not null default false;
alter table public.app_usuarios drop constraint if exists app_usuarios_permissoes_customizadas_array;
alter table public.app_usuarios add constraint app_usuarios_permissoes_customizadas_array
  check (permissoes_customizadas is null or jsonb_typeof(permissoes_customizadas) = 'array');
update public.app_usuarios
set usuario = lower(split_part(email, '@', 1))
where usuario is null and email is not null;
update public.app_usuarios
set usuario = 'usuario_' || replace(user_id::text, '-', '')
where usuario is null;
alter table public.app_usuarios alter column usuario set not null;
create unique index if not exists idx_app_usuarios_usuario on public.app_usuarios(usuario);

alter table public.app_usuarios drop constraint if exists app_usuarios_perfil_check;
update public.app_usuarios set perfil = 'geral' where perfil = 'administrador';
update public.app_usuarios set perfil = 'pesquisa' where perfil = 'visualizador';

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

alter table public.app_usuarios drop constraint if exists app_usuarios_perfil_fkey;
alter table public.app_usuarios add constraint app_usuarios_perfil_fkey
  foreign key (perfil) references public.app_perfis(slug) on update cascade;

create or replace function public.app_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((select u.ativo and (
      lower(u.usuario) = 'master'
      or coalesce(u.permissoes_customizadas, p.permissoes, '[]'::jsonb) ? 'gerenciador.gerenciar'
    )
    from public.app_usuarios u left join public.app_perfis p on p.slug = u.perfil
    where u.user_id = auth.uid()), false)
$$;

create or replace function public.app_has_permission(p_permission text)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((
    select u.ativo and (
      coalesce(u.permissoes_customizadas, p.permissoes) ? p_permission
      or (p_permission = 'pesquisar' and (coalesce(u.permissoes_customizadas, p.permissoes) ? 'painel.pesquisar' or coalesce(u.permissoes_customizadas, p.permissoes) ? 'consolidado.pesquisar'))
      or (p_permission = 'editar' and (coalesce(u.permissoes_customizadas, p.permissoes) ? 'painel.editar' or coalesce(u.permissoes_customizadas, p.permissoes) ? 'consolidado.editar'))
      or (p_permission = 'excluir' and (coalesce(u.permissoes_customizadas, p.permissoes) ? 'painel.excluir' or coalesce(u.permissoes_customizadas, p.permissoes) ? 'consolidado.excluir'))
      or (p_permission in ('importar','exportar') and coalesce(u.permissoes_customizadas, p.permissoes) ? ('painel.' || p_permission))
    )
    from public.app_usuarios u join public.app_perfis p on p.slug = u.perfil
    where u.user_id = auth.uid()
  ), false)
$$;

create or replace function public.app_can_access_company(p_empresa text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.app_usuarios u
    join public.app_perfis p on p.slug = u.perfil
    left join public.app_usuario_empresas e on e.user_id = u.user_id and e.empresa = p_empresa
    left join public.app_perfil_empresas pe on pe.perfil_slug = p.slug and pe.empresa = p_empresa
    where u.user_id = auth.uid() and u.ativo
      and ((u.empresas_customizadas and e.user_id is not null)
        or (not u.empresas_customizadas and (p.todas_empresas or pe.perfil_slug is not null)))
  )
$$;

alter table public.app_usuarios enable row level security;
alter table public.app_usuario_empresas enable row level security;
alter table public.app_logs enable row level security;
alter table public.app_perfis enable row level security;
alter table public.app_perfil_empresas enable row level security;

drop policy if exists "Usuarios consultam perfis" on public.app_perfis;
create policy "Usuarios consultam perfis" on public.app_perfis for select to authenticated using (true);
drop policy if exists "Geral gerencia perfis" on public.app_perfis;
create policy "Geral gerencia perfis" on public.app_perfis for all to authenticated
using (public.app_is_admin()) with check (public.app_is_admin());
drop policy if exists "Usuarios consultam empresas dos perfis" on public.app_perfil_empresas;
create policy "Usuarios consultam empresas dos perfis" on public.app_perfil_empresas for select to authenticated using (true);
drop policy if exists "Geral gerencia empresas dos perfis" on public.app_perfil_empresas;
create policy "Geral gerencia empresas dos perfis" on public.app_perfil_empresas for all to authenticated
using (public.app_is_admin()) with check (public.app_is_admin());

drop policy if exists "Usuario consulta proprio perfil" on public.app_usuarios;
create policy "Usuario consulta proprio perfil" on public.app_usuarios for select to authenticated
using (user_id = auth.uid() or public.app_is_admin());
drop policy if exists "Administrador gerencia usuarios" on public.app_usuarios;
create policy "Administrador gerencia usuarios" on public.app_usuarios for all to authenticated
using (public.app_is_admin()) with check (public.app_is_admin());

drop policy if exists "Usuario consulta empresas permitidas" on public.app_usuario_empresas;
create policy "Usuario consulta empresas permitidas" on public.app_usuario_empresas for select to authenticated
using (user_id = auth.uid() or public.app_is_admin());
drop policy if exists "Administrador gerencia empresas permitidas" on public.app_usuario_empresas;
create policy "Administrador gerencia empresas permitidas" on public.app_usuario_empresas for all to authenticated
using (public.app_is_admin()) with check (public.app_is_admin());

drop policy if exists "Usuario registra proprio log" on public.app_logs;
create policy "Usuario registra proprio log" on public.app_logs for insert to authenticated
with check (user_id = auth.uid());
drop policy if exists "Administrador consulta logs" on public.app_logs;
create policy "Administrador consulta logs" on public.app_logs for select to authenticated
using (public.app_has_permission('gerenciador.logs'));

grant select on public.app_usuarios, public.app_usuario_empresas, public.app_logs to authenticated;
grant select, insert, update, delete on public.app_perfis to authenticated;
grant select, insert, update, delete on public.app_perfil_empresas to authenticated;
grant insert on public.app_logs to authenticated;
grant insert, update, delete on public.app_usuarios, public.app_usuario_empresas to authenticated;
grant usage, select on sequence public.app_logs_id_seq to authenticated;
grant execute on function public.app_is_admin() to authenticated;
grant execute on function public.app_can_access_company(text) to authenticated;
grant execute on function public.app_has_permission(text) to authenticated;

-- As políticas anon existentes não são removidas: elas atendem exclusivamente às
-- duas telas públicas de captura. Usuários autenticados recebem somente as empresas marcadas.
drop policy if exists "Usuario consulta trajetos permitidos" on public.trajetos;
create policy "Usuario consulta trajetos permitidos" on public.trajetos for select to authenticated
using (public.app_can_access_company(cliente));
drop policy if exists "Usuario altera trajetos permitidos" on public.trajetos;
create policy "Usuario altera trajetos permitidos" on public.trajetos for update to authenticated
using (public.app_has_permission('editar') and public.app_can_access_company(cliente))
with check (public.app_has_permission('editar') and public.app_can_access_company(cliente));
drop policy if exists "Usuario importa trajetos" on public.trajetos;
create policy "Usuario importa trajetos" on public.trajetos for insert to authenticated
with check (public.app_has_permission('importar') and public.app_can_access_company(cliente));
drop policy if exists "Usuario exclui trajetos permitidos" on public.trajetos;
create policy "Usuario exclui trajetos permitidos" on public.trajetos for delete to authenticated
using (public.app_has_permission('excluir') and public.app_can_access_company(cliente));

drop policy if exists "Usuario consulta pontos permitidos" on public.trajeto_pontos;
create policy "Usuario consulta pontos permitidos" on public.trajeto_pontos for select to authenticated
using (exists (select 1 from public.trajetos t where t.id = trajeto_id and public.app_can_access_company(t.cliente)));
drop policy if exists "Usuario altera pontos permitidos" on public.trajeto_pontos;
create policy "Usuario altera pontos permitidos" on public.trajeto_pontos for update to authenticated
using (public.app_has_permission('editar') and exists (select 1 from public.trajetos t where t.id = trajeto_id and public.app_can_access_company(t.cliente)))
with check (public.app_has_permission('editar') and exists (select 1 from public.trajetos t where t.id = trajeto_id and public.app_can_access_company(t.cliente)));
drop policy if exists "Usuario inclui pontos permitidos" on public.trajeto_pontos;
create policy "Usuario inclui pontos permitidos" on public.trajeto_pontos for insert to authenticated
with check (public.app_has_permission('editar') and exists (select 1 from public.trajetos t where t.id = trajeto_id and public.app_can_access_company(t.cliente)));
drop policy if exists "Usuario exclui pontos permitidos" on public.trajeto_pontos;
create policy "Usuario exclui pontos permitidos" on public.trajeto_pontos for delete to authenticated
using (public.app_has_permission('excluir') and exists (select 1 from public.trajetos t where t.id = trajeto_id and public.app_can_access_company(t.cliente)));

-- Tabelas auxiliares usadas pelo painel autenticado.
drop policy if exists "Anon consulta historico de demandas" on public.demanda_historico;
drop policy if exists "Usuario consulta historico permitido" on public.demanda_historico;
drop policy if exists "Anon registra historico de demandas" on public.demanda_historico;
drop policy if exists "Usuario registra historico permitido" on public.demanda_historico;
drop policy if exists "Usuario consulta operadores" on public.operadores_planejamento;
drop policy if exists "Usuario cadastra operadores" on public.operadores_planejamento;
drop policy if exists "Usuario atualiza operadores" on public.operadores_planejamento;
drop policy if exists "Usuario consulta alinhamentos permitidos" on public.alinhamentos_execucao;
drop policy if exists "Usuario cria alinhamentos permitidos" on public.alinhamentos_execucao;
drop policy if exists "Usuario atualiza alinhamentos permitidos" on public.alinhamentos_execucao;
drop policy if exists "Usuario consulta perguntas" on public.ajuda_perguntas;
drop policy if exists "Usuario responde perguntas" on public.ajuda_perguntas;
drop policy if exists "Usuario exclui perguntas" on public.ajuda_perguntas;
drop policy if exists "Anon consulta linhas configuradas" on public.linhas_configuradas;
drop policy if exists "Usuario consulta linhas permitidas" on public.linhas_configuradas;
drop policy if exists "Usuario cadastra linhas permitidas" on public.linhas_configuradas;
drop policy if exists "Usuario edita linhas permitidas" on public.linhas_configuradas;
drop policy if exists "Usuario exclui linhas permitidas" on public.linhas_configuradas;
drop policy if exists "Permitir consultar historico de demandas" on public.demanda_historico;
create policy "Anon consulta historico de demandas" on public.demanda_historico for select to anon using (true);
create policy "Usuario consulta historico permitido" on public.demanda_historico for select to authenticated
using (public.app_can_access_company(cliente));
drop policy if exists "Permitir registrar historico de demandas" on public.demanda_historico;
create policy "Anon registra historico de demandas" on public.demanda_historico for insert to anon with check (true);
create policy "Usuario registra historico permitido" on public.demanda_historico for insert to authenticated
with check (public.app_has_permission('editar') and public.app_can_access_company(cliente));

create policy "Usuario consulta operadores" on public.operadores_planejamento for select to authenticated
using (public.app_has_permission('pesquisar'));
create policy "Usuario cadastra operadores" on public.operadores_planejamento for insert to authenticated
with check (public.app_has_permission('editar'));
create policy "Usuario atualiza operadores" on public.operadores_planejamento for update to authenticated
using (public.app_has_permission('editar')) with check (public.app_has_permission('editar'));

create policy "Usuario consulta alinhamentos permitidos" on public.alinhamentos_execucao for select to authenticated
using (public.app_can_access_company(cliente));
create policy "Usuario cria alinhamentos permitidos" on public.alinhamentos_execucao for insert to authenticated
with check (public.app_has_permission('editar') and public.app_can_access_company(cliente));
create policy "Usuario atualiza alinhamentos permitidos" on public.alinhamentos_execucao for update to authenticated
using (public.app_has_permission('editar') and public.app_can_access_company(cliente))
with check (public.app_has_permission('editar') and public.app_can_access_company(cliente));

create policy "Usuario consulta perguntas" on public.ajuda_perguntas for select to authenticated
using (public.app_has_permission('editar'));
create policy "Usuario responde perguntas" on public.ajuda_perguntas for update to authenticated
using (public.app_has_permission('editar')) with check (public.app_has_permission('editar'));
create policy "Usuario exclui perguntas" on public.ajuda_perguntas for delete to authenticated
using (public.app_has_permission('excluir'));

drop policy if exists "Permitir consultar linhas configuradas" on public.linhas_configuradas;
create policy "Anon consulta linhas configuradas" on public.linhas_configuradas for select to anon using (true);
create policy "Usuario consulta linhas permitidas" on public.linhas_configuradas for select to authenticated
using (public.app_can_access_company(cliente));
drop policy if exists "Permitir cadastrar linhas configuradas" on public.linhas_configuradas;
create policy "Usuario cadastra linhas permitidas" on public.linhas_configuradas for insert to authenticated
with check (public.app_has_permission('editar') and public.app_can_access_company(cliente));
drop policy if exists "Permitir editar linhas configuradas" on public.linhas_configuradas;
create policy "Usuario edita linhas permitidas" on public.linhas_configuradas for update to authenticated
using (public.app_has_permission('editar') and public.app_can_access_company(cliente))
with check (public.app_has_permission('editar') and public.app_can_access_company(cliente));
drop policy if exists "Permitir excluir linhas configuradas" on public.linhas_configuradas;
create policy "Usuario exclui linhas permitidas" on public.linhas_configuradas for delete to authenticated
using (public.app_has_permission('excluir') and public.app_can_access_company(cliente));

-- O histórico de versões segue a mesma empresa do trajeto.
do $$
begin
  if to_regclass('public.trajeto_versoes') is not null then
    execute 'drop policy if exists "Permitir consultar versoes" on public.trajeto_versoes';
    execute 'drop policy if exists "Anon consulta versoes" on public.trajeto_versoes';
    execute 'drop policy if exists "Usuario consulta versoes permitidas" on public.trajeto_versoes';
    execute 'create policy "Usuario consulta versoes permitidas" on public.trajeto_versoes for select to authenticated using (exists (select 1 from public.trajetos t where t.id = trajeto_id and public.app_can_access_company(t.cliente)))';
  end if;
end $$;

-- Bootstrap do usuário master: crie-o primeiro em Authentication > Users com o
-- identificador técnico master@acesso.trajetocaptura.com.br e a senha provisória escolhida.
-- Depois execute este bloco para torná-lo administrador do sistema:
insert into public.app_usuarios (user_id, nome, usuario, email, perfil, ativo)
select id, 'Master', 'master', 'master@acesso.trajetocaptura.com.br', 'geral', true
from auth.users
where email = 'master@acesso.trajetocaptura.com.br'
on conflict (user_id) do update
set nome = 'Master', usuario = 'master', perfil = 'geral', ativo = true, updated_at = now();
