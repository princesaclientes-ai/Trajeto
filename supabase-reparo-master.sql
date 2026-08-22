-- Execute depois de criar e confirmar o usuário abaixo em Authentication:
-- master@acesso.trajetocaptura.com.br

do $$
declare
  v_master_id uuid;
begin
  select id into v_master_id
  from auth.users
  where lower(email) = 'master@acesso.trajetocaptura.com.br'
    and deleted_at is null
  limit 1;

  if v_master_id is null then
    raise exception 'Crie primeiro master@acesso.trajetocaptura.com.br em Authentication > Users';
  end if;

  if not exists (
    select 1 from auth.users
    where id = v_master_id and email_confirmed_at is not null
  ) then
    raise exception 'O usuário Master ainda não foi confirmado';
  end if;

  -- Remove apenas um vínculo antigo do login Master. Trajetos não são afetados.
  delete from public.app_usuarios
  where usuario = 'master' and user_id <> v_master_id;

  insert into public.app_usuarios (
    user_id, nome, usuario, email, perfil, ativo,
    permissoes_customizadas, empresas_customizadas
  ) values (
    v_master_id, 'Master', 'master',
    'master@acesso.trajetocaptura.com.br', 'geral', true,
    null, false
  )
  on conflict (user_id) do update set
    nome = 'Master', usuario = 'master',
    email = 'master@acesso.trajetocaptura.com.br',
    perfil = 'geral', ativo = true,
    permissoes_customizadas = null,
    empresas_customizadas = false,
    updated_at = now();
end $$;

select u.id, u.email, u.email_confirmed_at, p.usuario, p.perfil, p.ativo
from auth.users u
join public.app_usuarios p on p.user_id = u.id
where lower(u.email) = 'master@acesso.trajetocaptura.com.br';
