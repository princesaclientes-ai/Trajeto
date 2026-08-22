-- Vincula ao gerenciador o usuário que já existe no Supabase Authentication.
-- Não altera a senha e pode ser executado novamente com segurança.

insert into public.app_usuarios (
  user_id,
  nome,
  usuario,
  email,
  perfil,
  ativo,
  permissoes_customizadas,
  empresas_customizadas
)
select
  id,
  'Josieli',
  'josieli',
  'josieli@acesso.trajetocaptura.com.br',
  'pesquisa',
  true,
  null,
  false
from auth.users
where id = '7504deb3-ce88-426c-bd46-295bb239fdba'
  and lower(email) = 'josieli@acesso.trajetocaptura.com.br'
on conflict (user_id) do update set
  nome = excluded.nome,
  usuario = excluded.usuario,
  email = excluded.email,
  ativo = true,
  updated_at = now();

select user_id, nome, usuario, email, perfil, ativo
from public.app_usuarios
where user_id = '7504deb3-ce88-426c-bd46-295bb239fdba';
