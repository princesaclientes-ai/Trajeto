-- Somente leitura. O SQL Editor não usa a sessão do usuário do painel.
-- Confira as regras instaladas e as permissões efetivas cadastradas.
select p.oid::regprocedure as funcao, pg_get_functiondef(p.oid) as definicao
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('app_has_permission', 'copy_official_route');

select u.usuario, u.ativo, u.perfil,
  coalesce(u.permissoes_customizadas, p.permissoes) as permissoes_efetivas
from public.app_usuarios u left join public.app_perfis p on p.slug = u.perfil
order by u.usuario;
