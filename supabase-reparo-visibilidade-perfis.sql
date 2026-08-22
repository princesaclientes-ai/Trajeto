-- Libera a consulta dos perfis e das empresas vinculadas aos perfis.
-- Necessário para preencher o seletor "Perfil existente" no gerenciador.

alter table public.app_perfis enable row level security;
alter table public.app_perfil_empresas enable row level security;

grant select on public.app_perfis to authenticated;
grant select on public.app_perfil_empresas to authenticated;

drop policy if exists "Usuarios consultam perfis" on public.app_perfis;
create policy "Usuarios consultam perfis"
on public.app_perfis
for select
to authenticated
using (true);

drop policy if exists "Usuarios consultam empresas dos perfis" on public.app_perfil_empresas;
create policy "Usuarios consultam empresas dos perfis"
on public.app_perfil_empresas
for select
to authenticated
using (true);

select slug, nome, todas_empresas, perfil_sistema
from public.app_perfis
order by nome;
