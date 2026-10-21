# Permissões HML — aceite manual em andamento — 21/10/2026

H03 permanece **parcial**. Fonte desta evidência: relatos do usuário executando
os passos no próprio tablet, em sessão separada da aba integrada do agente.
O agente não acessou credenciais, OTP, cookies, dados operacionais ou a sessão
do tablet. Perfil em teste: Funcionário, conforme o roteiro solicitado e o
menu relatado; vínculo/papel canônico no banco não foi relido nesta rodada.
Versão ativa do Worker não foi reconferida; último checkpoint documentado
bb76764/22733c04 não é prova nova da versão usada no tablet.

## Resultados relatados

| Caso | Resultado | Natureza da evidência |
| --- | --- | --- |
| Entrada no painel | Login relatado | Relato humano; não comprova expiração/revogação ou demais casos H01/H02 |
| Menu do Funcionário | Somente Compras, Vendas, Categorias e Produtos | Compatível com a política atual |
| Catálogo | Brownies e preços de venda visíveis | Leitura permitida ao Funcionário; não confundir preço de venda com custo |
| /estoque por endereço direto | Retornou para /compras | Bloqueio de navegação confirmado pelo usuário |
| /relatorios por endereço direto | Bloqueado, retorno esperado a Compras | Usuário confirmou ambos os bloqueios de Relatórios/Financeiro |
| /financeiro por endereço direto | Bloqueado, retorno esperado a Compras | Mesmo relato acima |
| /producao por endereço direto | Retornou para /compras | Usuário confirmou explicitamente os três casos após esclarecimento |
| /cenarios por endereço direto | Retornou para /compras | Mesmo esclarecimento acima |
| /parametros por endereço direto | Retornou para /compras | Mesmo esclarecimento acima |
| /despesas por endereço direto | Retornou para /compras | Usuário confirmou todos os três casos de Despesas/Locais/Plano de ação |
| /locais por endereço direto | Retornou para /compras | Mesmo relato acima |
| /plano-de-acao por endereço direto | Retornou para /compras | Mesmo relato acima |

## Ordem do menu solicitada

Após esses testes, usuário solicitou Vendas → Produtos → Compras → Categorias
para o Funcionário. Alteração somente de apresentação, preservando o filtro
por permissão e a ordem dos demais perfis. Preparada para a publicação
conjunta após a homologação; não foi publicada no HML por esta solicitação.

## Pendências

Concluir demais rotas restritas e leituras permitidas, sem salvar fatos
sintéticos. Identificar papel real e versão publicada por mecanismo autorizado;
testar Gerente/Dono com sessões próprias. A rota protegida não comprova por si
a negação de chamadas diretas às Server Functions: executor de leitura precisa
de preparação/revisão conforme o roteiro da PR #50. Não enviar mutações válidas
ao banco compartilhado para testar uma negação. H01/H02, auditoria, celular e
publicação conjunta permanecem etapas próprias no roadmap.

Não houve merge, deploy, alteração de papéis ou escrita de fatos nesta rodada.
Referências: [roadmap](ROADMAP-CODEX.md), [política de segurança](SECURITY.md) e
[PR #50](https://github.com/naiguelcabral/seus-brownies/pull/50).


## Gerente — aceite guiado nesta execução

Usuário escolheu testar no próprio dispositivo. Relatou que Visão geral,
Relatórios, Estoque, Financeiro e Cenários abriram corretamente, com Cenários
sem possibilidade de edição. Em seguida confirmou que `/parametros` e
`/fifo-migration-audit` bloquearam e retornaram à Visão geral. Nenhuma operação
foi salva por esse roteiro. Estes são relatos humanos de interface. Na rodada seguinte, o usuário
confirmou `manager` no endpoint de sessão, `result` no GET direto de Dashboard
e negação de permissão no GET direto de Parâmetros. Evidência das chamadas é
relato humano do resultado RPC, sem coleta do payload.

O agente não tem navegador/sessão conectada nesta execução. Os sete arquivos
de testes Node de autenticação/permissões conferidos pela frente paralela
passaram; os doze casos HTTP/PostgreSQL 17 da candidata S04 passaram também,
incluindo matriz isolada e revogação. Não substituem aceite HML.

## Chamadas diretas de leitura — roteiro preparado

Identificadores extraídos dos bundles públicos efetivamente servidos em
21/10/2026: `index-CTGCDMnA.js`, `functions-DIHJx6fs.js` e
`createServerFn-DPxJ06LA.js`; base `/_serverFn/` declarada no cliente publicado.
Não são identificadores adivinhados nem URLs de página. Nenhuma credencial
foi coletada. Podem mudar em uma publicação futura: reconferir os bundles
antes de reutilizar os links após deploy.

Abrir no mesmo navegador autenticado do perfil; se necessário, copiar o link
para a barra de endereços. O resultado é JSON serializado do TanStack.
Verificar `result` versus `error` e a mensagem, não somente o HTTP: uma
negação pode responder HTTP 200. Não enviar o payload ou captura com dados à
conversa; relatar somente papel, aprovado/negado e eventual mensagem de erro.

| Consulta GET | Link da versão publicada | Funcionário | Gerente | Dono |
| --- | --- | --- | --- | --- |
| Papel canônico sem dados pessoais | [Sessão](https://cacau-v1-hml.naiguelcabral.workers.dev/_serverFn/6bf21914582169c99517353bcabad84a7f72746bd9b373ef799e60571bae1ada) | employee | manager | owner |
| Visão geral | [Dashboard direto](https://cacau-v1-hml.naiguelcabral.workers.dev/_serverFn/ca73fe5e497a208d8ec5e9245bb8438dbd0caf3489ab7509265d960f83128dca) | Negar permissão | result | result |
| Parâmetros | [Parâmetros diretos](https://cacau-v1-hml.naiguelcabral.workers.dev/_serverFn/0a070181afafa6222c58e19bd053a8575c4b8d7ec513fd6145dbdfed12dd87ee) | Negar permissão | Negar permissão | result |

O endpoint de Dashboard sem sessão foi consultado pelo agente e retornou
`Autenticação obrigatória para esta operação.`, em erro RPC serializado com
HTTP 200. É evidência nova de negação anônima dessa leitura, não de RBAC dos
três perfis. Gerente confirmou os três resultados esperados em sessão própria.
Funcionário confirmou depois os três resultados esperados; Dono segue em coleta. A consulta anônima de sessão também
confirmou flags falsas/papel nulo; Parâmetros anônimo negou autenticação. Os três links não representam cobertura de todas as 55 políticas;
mutações válidas no HML continuam fora deste roteiro sem fatos reais.


## Funcionário — confirmação das chamadas diretas

Após o roteiro de três GETs no mesmo navegador autenticado, o usuário
confirmou: “Testes do funcionário estão ok”. O aceite corresponde ao roteiro
imediatamente anterior: sessão com papel `employee`, Dashboard direto e
Parâmetros diretos negados por permissão. Complementa o aceite anterior das
rotas e do menu. Resultado é relato humano; nenhum payload, credencial ou
sessão foi coletado pelo agente. Dono permanece pendente e recebeu o roteiro
de interface, papel canônico e duas consultas diretas, sem salvar operações.


## Dono — falha de sessão, aceite pendente

Usuário relatou inicialmente autenticação obrigatória no GET e depois falha
na verificação da sessão ao colar o endereço no HML já autenticado. Não há
confirmação de `owner` ou dos GETs permitidos. Logs agregados recentes revelam
duas falhas HTTP 429 no caminho de sessão, sem identificação da conta ou
correlação individual. [Investigação e limites](AUTH-HML-SESSION-LIMIT-2026-10-21.md).
Orientada uma consulta após intervalo sem repetição; usuário confirmou
“Agora apareceu owner”. Sessão recuperada nessa leitura e papel confirmado
por relato do endpoint. Dashboard/Parâmetros e controles da interface do Dono
seguem em coleta; a causa/solução permanente do limite não foi demonstrada.
