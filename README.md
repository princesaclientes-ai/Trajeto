# Registro de Trajeto

Aplicacao web responsiva para o condutor iniciar um trajeto, registrar varios pontos com latitude/longitude e finalizar o trajeto no Supabase.

## Arquivos

- `supabase.sql`: cria as tabelas `trajetos` e `trajeto_pontos`, relacionamento, indices e politicas RLS.
- `index.html`: estrutura da tela.
- `styles.css`: layout responsivo pensado para celular Android.
- `app.js`: integracao com Supabase, geolocalizacao e fluxo completo do trajeto.
- `route-options.js`: base de clientes, sentidos e linhas usada nos selects do aplicativo.
- `painel.html`: tela desktop local para visualizar trajetos e pontos capturados.
- `painel.css`: layout desktop do painel.
- `painel.js`: leitura do Supabase e atualizacao automatica do painel.

## Configurar Supabase

1. No Supabase, abra `SQL Editor`.
2. Cole e execute o conteudo de `supabase.sql`.
3. Abra `Project Settings` > `API`.
4. Copie a `Project URL`.
5. Copie a chave `anon public`.
6. No arquivo `app.js`, substitua:

```js
const SUPABASE_URL = "COLE_AQUI_A_URL_DO_PROJETO_SUPABASE";
const SUPABASE_ANON_KEY = "COLE_AQUI_A_CHAVE_ANON_PUBLIC";
```

## Como testar no computador

Na pasta do projeto, rode um servidor local:

```powershell
python -m http.server 5500
```

Acesse:

```text
http://localhost:5500
```

Para abrir o painel desktop local:

```text
http://localhost:5500/painel.html
```

No painel, use os filtros de `Matricula`, `Cliente` e `Status` para validar os trajetos por condutor. A rota capturada fica vinculada ao condutor pelo campo `matricula_condutor`.
O painel tambem permite finalizar um trajeto ativo e excluir um trajeto com seus pontos.

## Como testar no celular Android

1. Conecte o computador e o celular na mesma rede Wi-Fi.
2. No computador, descubra o IP local:

```powershell
ipconfig
```

3. Procure o `Endereço IPv4`, por exemplo `192.168.0.10`.
4. Com o servidor ligado, acesse no celular:

```text
http://192.168.0.10:5500
```

5. Permita o acesso a localizacao quando o navegador pedir.
6. Informe matricula, selecione o cliente, selecione o sentido e selecione a linha.
7. Toque em `Primeiro ponto`. Esse clique cria o trajeto e grava o ponto 1.
8. Toque em `Registrar ponto` quantas vezes precisar para gravar os proximos pontos.
9. Toque em `Finalizar trajeto`. O app limpa os campos e fica pronto para outra rota.

Se o condutor sair do navegador para outro aplicativo e depois voltar, o app tenta restaurar o trajeto ativo automaticamente. Isso permite continuar registrando pontos ou finalizar o trajeto, desde que a aba nao esteja em modo anonimo/privado e o armazenamento local do navegador nao tenha sido limpo.

Observacao: alguns navegadores bloqueiam geolocalizacao fora de HTTPS, mas geralmente permitem em `localhost`. Para testar pelo celular em rede local, se o navegador bloquear a localizacao, publique a pagina em um dominio HTTPS ou use um tunel HTTPS.

## Como conferir os dados no Supabase

No `Table Editor`:

1. Abra a tabela `trajetos`.
2. Confira `matricula_condutor`, `cliente`, `status`, `data_hora_inicio` e `data_hora_fim`.
3. Copie o `id` do trajeto.
4. Abra a tabela `trajeto_pontos`.
5. Filtre `trajeto_id` pelo `id` copiado.
6. Confira `latitude`, `longitude`, `data_hora_registro` e `ordem_ponto`.

Ou use SQL:

```sql
select *
from public.trajetos
order by created_at desc;
```

```sql
select tp.*
from public.trajeto_pontos tp
where tp.trajeto_id = 'COLE_AQUI_O_ID_DO_TRAJETO'
order by tp.ordem_ponto;
```
