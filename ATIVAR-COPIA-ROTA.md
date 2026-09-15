# Copiar rota oficial

## Sincronização das cópias

### Correção de 15/09/2026

**Atualização das telas:** `painel.js` agora busca novamente geometria, nós, status e horários ao abrir os detalhes de uma linha. `consolidado-linhas.js` recarrega os trajetos do cliente, incluindo as cópias, após oficializar. Antes, as duas telas podiam mostrar o desenho antigo mesmo com os pontos atualizados no banco. Publique `painel.html`, `painel.js`, `consolidado-linhas.html` e `consolidado-linhas.js` juntos (pacote `correcao-sincronizacao-telas-20260915.zip`). Os HTMLs incluem nova versão dos scripts para renovar o cache. Se o SQL abaixo já foi executado, esta correção das telas não exige executá-lo novamente. Validação: 21 testes locais passaram; o comportamento no site publicado ainda precisa ser conferido.

Execute **supabase-copiar-rota-oficial.sql completo** no SQL Editor do Supabase. Esta revisão também atualiza as cópias vinculadas que ficaram atrasadas antes da instalação. Alterações sucessivas na mesma transação são verificadas pelo conteúdo; isso corrige o caso em que uma cópia era processada antes de sua origem e não repassava a atualização final às próximas cópias.

Cada linha oficial atualiza exclusivamente os destinos cujo `trajeto_origem_id` aponta para ela. Um índice acelera essa busca com várias origens e vários destinos. Cliente, nome da linha e horário próprio do destino são preservados.

Para conferir **2B - Nova Odessa → 2B.1 - Nova Odessa 22:30h**, execute `supabase-diagnostico-sincronizacao-copias.sql`. Ele mostra o vínculo e os gatilhos instalados, sem alterar dados. Se o destino estiver sem vínculo, será necessário identificar os IDs corretos de origem e destino, incluindo cliente e sentido; o reparo não associa linhas automaticamente pelo nome.

Validação local: PostgreSQL via PGlite, com Entrada/Saída, virada de dia, múltiplas origens, vários destinos, cópias encadeadas, duas alterações na mesma transação, recuperação de cópias antigas e reinstalação do SQL. A instalação no Supabase ainda precisa ser realizada; alterar os arquivos do site não instala os gatilhos do banco.

Execute novamente o arquivo SQL completo para ativar a sincronização automática. As cópias vinculadas por `trajeto_origem_id` acompanham alterações de pontos, ordem, geometria e nós da origem, incluindo edições pelo painel e consolidado. A sincronização usa o estado final da transação. A partida de Saída e a chegada ao cliente de Entrada são preservadas em `copia_horario_referencia`; os demais horários são deslocados conforme os intervalos atualizados da origem. Cópias já existentes recebem sua referência atual ao instalar o SQL. Após a atualização, a cópia fica no status `trajeto` para nova conferência/exportação. A exclusão da origem não apaga suas cópias. Execuções sem pontos suficientes não são propagadas.

Correção de permissão: execute novamente o SQL atualizado para que a cópia reconheça `editar` e `painel.editar`. A função continua exigindo usuário autenticado e acesso aos clientes de origem e destino. O painel verifica a sessão antes de enviar a cópia. Se o banco continuar negando edição, confira as permissões do usuário no gerenciador; esta atualização não altera as permissões cadastradas dos usuários.

Atualização para execuções antigas: linhas `importado` ou `trajeto` com pelo menos dois pontos salvos podem fornecer o itinerário mesmo sem geometria oficial. O painel calcula a geometria pelas ruas antes de habilitar a cópia. A origem não é alterada. Execute novamente `supabase-copiar-rota-oficial.sql` para instalar a assinatura que recebe essa geometria. A contagem de registros do checklist passou a usar totais calculados no banco por execução.

No cartão não percorrido, os combos **Cliente de origem** e **Linha oficial de origem** exibem os cadastros disponíveis para o usuário. É possível usar uma origem de outro cliente autorizado. A lista de origem mostra somente execuções oficiais com geometria validada e o mesmo sentido do destino, carregadas diretamente dos trajetos salvos. Para esta atualização, execute novamente `supabase-copiar-rota-oficial.sql`: a função passou a receber também o cliente de destino.

## Ativação

1. No SQL Editor do projeto Supabase, execute `supabase-copiar-rota-oficial.sql` inteiro. Ele depende das funções de acesso instaladas por `supabase-gerenciador-acessos.sql`.
2. Para o site publicado, atualize `painel.html`, `painel.css`, `painel.js`, `copiar-rota.js`, `consolidado-linhas.html`, `consolidado-linhas.js` e `mapa-base.js` juntos.
3. Reabra o painel. Os arquivos locais desta pasta já estão atualizados.

## Utilização

Também é possível iniciar pelo cartão da linha **não percorrida**: clique em **Copiar rota oficial**, busque o nome da linha de origem e selecione a execução oficial. O destino fica fixado na linha do cartão. As origens disponíveis pertencem ao cliente de origem selecionado, têm o mesmo sentido do destino e possuem geometria validada. Depois informe data e horário e confira a previsão antes de criar.

1. Selecione uma execução oficial, com geometria validada (status `trajeto` ou `importado`).
2. Clique em **Copiar rota oficial**, ao lado das exportações.
3. Escolha uma linha **não percorrida**, cadastrada no mesmo cliente e sentido. A lista exclui linhas que já possuem execução, inclusive em andamento ou já copiadas. O banco verifica novamente essa condição ao criar a cópia.
4. Informe a data e o horário de referência em Brasília. Em **Saída**, é a partida no primeiro ponto de parada. Em **Entrada**, é a chegada ao cliente no último ponto de parada.
5. Confira o início e o fim previstos e clique em **Criar cópia oficial**.

Os pontos, a ordem, a geometria e os intervalos de tempo da origem são preservados. A nova rota fica com status `trajeto`, pronta para conferência e exportação JSON/Excel. A origem não é modificada.

A matrícula da cópia é `COPIA-OFICIAL`, para não atribuir uma nova coleta a um condutor. O banco registra a origem em `trajeto_origem_id` e o usuário responsável em `copiado_por`. A operação exige login, permissão de edição e acesso ao cliente. A gravação é atômica e não substitui uma execução já existente na linha de destino.

## Primeiro ponto

O botão agora informa **Este já é o primeiro ponto** quando estiver desativado. No mapa do painel, a identificação do primeiro ponto considera a sequência atual, e as mensagens de alteração aparecem no mapa.

## Validação

Foram executados testes locais de reordenação, falha de recálculo, classificação do primeiro ponto, exportação JSON e ajuste de horários de cópia, incluindo virada de dia. A função SQL precisa ser ativada e validada no Supabase; não foi executada no banco nesta sessão.
