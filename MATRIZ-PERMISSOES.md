# Matriz de telas e permissões

| Tela | Pesquisa/consulta | Edição | Exclusão | Importação/exportação |
|---|---|---|---|---|
| `index.html` | Consulta opções de cliente e linha | Cria trajeto, registra pontos e finaliza a própria captura | Não possui | Não possui |
| `index2.html` | Consulta opções e ajuda | Cria trajeto, registra pontos, finaliza captura e envia pergunta | Não possui | Não possui |
| `painel.html` | Filtros, checklist, detalhes, mapa, histórico e busca de endereço | Finalizar/validar/voltar status; alinhar condutor; editar ordem, posição, tipo e camada; incluir pontos/nós; responder ajuda | Trajeto/lixeira, pontos, intervalos, nós e perguntas | Exportar JSON/OrUS e Excel |
| `consolidado-linhas.html` | Cliente, sentido, linhas, mapa e busca de endereço | Novo estudo; mover/reordenar/incluir pontos; nós; horário/velocidade; salvar/oficializar/restaurar versão | Pontos manuais e nós dentro do estudo | Não possui importação de arquivo nesta tela |
| `gerenciador-acessos.html` | Usuários, empresas concedidas, matriz e logs | Criar login; alterar perfil e empresas | Bloquear/remover acesso (administração) | Não possui arquivos de trajeto |
| `login.html` | Autenticação por usuário | Não possui | Não possui | Não possui |

## Perfis

| Capacidade | Pesquisa | Nível 1 | Geral |
|---|:---:|:---:|:---:|
| Visualizar, filtrar e pesquisar | Sim | Sim | Sim |
| Editar dados e oficializar estudos | Não | Sim | Sim |
| Excluir ou restaurar dados | Não | Não | Sim |
| Importar/exportar arquivos | Não | Não | Sim |
| Criar usuários, conceder empresas e ver logs | Não | Não | Sim |
| Abrangência de clientes | Empresas marcadas | Empresas marcadas | Todos |

`index.html` e `index2.html` são exceções públicas destinadas à captura. Não exigem login e não recebem os perfis administrativos acima.

## Perfis personalizados

O gerenciador permite criar novos perfis combinando permissões separadas por tela:

- Painel de Pontos: pesquisa, edição, exclusão, importação e exportação.
- Consolidado/editor: pesquisa, edição/oficialização e exclusão.
- Administração: gerenciamento de usuários/perfis e consulta de logs.
- Abrangência: todas as empresas ou somente as empresas concedidas ao usuário.

Cada perfil também possui um quadro de clientes. Ao associar o perfil a um usuário, as empresas são preenchidas automaticamente e podem ser marcadas ou desmarcadas como uma exceção individual.

O usuário `master` permanece associado ao perfil de sistema `Geral`.
