# Copiar rota oficial

## Sincronização das cópias

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
