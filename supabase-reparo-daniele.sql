-- Corrige o nome e o identificador do usuário já existente no cadastro do aplicativo.
-- Não altera UID, perfil, permissões, empresas ou senha.

update public.app_usuarios
set
  nome = 'Daniele',
  usuario = 'daniele',
  email = 'daniele@acesso.trajetocaptura.com.br',
  updated_at = now()
where lower(usuario) = 'deniele'
  and lower(email) = 'deniele@acesso.trajetocaptura.com.br';

select user_id, nome, usuario, email, perfil, ativo
from public.app_usuarios
where lower(usuario) = 'daniele';
