# Matriz de autorização — Cacau v1

## Estado e fontes

Reconciliada em 21/10/2026 com `authorization.ts`, `ui-access.ts` e as 55
políticas de `server-function-policy.ts`, em `src/features/auth/`. Esta revisão
documenta as permissões existentes; não concede papéis nem altera RBAC.

Em 26/10/2026, o usuário aprovou a delegação de liberação de cadastros ao
Gerente. A seção seguinte define o escopo a implementar. As tabelas de
permissões e rotas atuais continuam refletindo o código integrado em #74;
o Gerente ainda não dispõe do fluxo de aprovação.

Guards no servidor exigem identidade Neon verificada, vínculo ativo em
`app_user_access` e permissão da operação. A interface também restringe rotas,
mas ocultar um menu ou redirecionar uma página não comprova a negação da
chamada direta no servidor.

O laboratório isolado aprovou quatro perfis e negações entre as 55 políticas,
incluindo ausência de escrita e revogação na próxima chamada. As contas reais
de Gerente e Funcionário tiveram entrada confirmada pelo usuário. H01–H03
continuam parciais: matriz no ambiente publicado, chamadas diretas, sessão e
casos antiabuso reais exigem evidência própria. Procedimento em
[AUTH-HML-ACCEPTANCE.md](AUTH-HML-ACCEPTANCE.md); estado geral em
[PROJECT-STATUS.md](PROJECT-STATUS.md) e [ROADMAP-CODEX.md](ROADMAP-CODEX.md).
O diagnóstico de setembro em `G1-CLOUDFLARE-HML.md` é histórico.

## Princípios

- O servidor decide por permissão do vínculo Cacau, sem confiar no papel do
  provedor de identidade nem no menu exibido.
- Receita, despesa, custo e margem exigem autorização financeira explícita.
- Escopo “dados próprios” não está habilitado. Autoria e auditoria não concedem
  automaticamente acesso por autor, local ou unidade.
- Estoque, dinheiro, FIFO, cancelamento e devolução preservam suas regras de
  domínio e auditoria, além da permissão de entrada.
- Mudanças de permissão dependem de `HUMAN-APPROVALS.md`.

## Decisão de liberação de cadastros — S02/A04

| Ação | Dono | Gerente | Funcionário |
| --- | --- | --- | --- |
| Aprovar primeiro acesso como Funcionário, após validação | permitir | permitir | negar |
| Conceder ou alterar papel Gerente/Dono | permitir | negar | negar |
| Reativar acesso inativo/revogado ou alterar vínculo existente | permitir | negar | negar |
| Aprovar o próprio acesso por esse fluxo | negar | negar | negar |
| Administrar configurações e diagnóstico com `access:manage` | permitir | negar | negar |

A delegação ao Gerente deve usar permissão própria, prevista como
`access:approve`, sem incluir `access:manage` no seu perfil. O Dono mantém
todas as permissões funcionais. Não conceder papéis legados a novas contas.

A validação deve confirmar cadastro conforme seus campos obrigatórios,
identidade/e-mail verificado pelo provedor e ausência de vínculo preexistente
para a primeira liberação. O servidor revalida o aprovador e o destinatário;
dados recebidos do cliente não comprovam verificação nem autorizam promoção.
Uma conta cadastrada sem aprovação permanece sem acesso operacional.

Concessão e evento de auditoria devem ser atômicos, identificando aprovador,
destinatário, mudança, motivo, UTC e referência de operação. Testar negações,
falha do provedor/auditoria, revogação do aprovador, repetição e concorrência.
Proteger o último Dono ativo e cumprir a política de sessão em mudanças de
privilégio. Não reatribuir autoria a concessões históricas.

Esta é a política aprovada e seu detalhamento conservador para implementação;
S02 e a autoria futura de A04 permanecem pendentes. Não há nova tela, endpoint,
permissão executável, concessão real ou homologação entregue por este registro.

## Papéis canônicos

| Papel | Finalidade |
| --- | --- |
| Dono (`owner`) | Toda a operação, configuração e administração de acessos. |
| Gerente (`manager`) | Gestão diária e compensações autorizadas. No código atual, sem aprovação de acessos; delegação limitada de cadastros aprovada em S02. Sem fechar/corrigir períodos ou editar cenários. |
| Funcionário (`employee`) | Selecionar catálogo e registrar compras e vendas; sem leituras financeiras, dashboard ou histórico geral de compras/vendas. |

`admin`, `production`, `sales` e `viewer` são compatibilidades legadas.
Não conceder esses papéis a novas contas nem para completar uma matriz de
homologação. `production` no laboratório não implica uma conta real com esse
papel. E-mail ou nome de uma pessoa também não comprova seu papel: conferir o
vínculo atual sem registrar dados pessoais no Git.

## Permissões atuais

| Permissão | Dono | Gerente | Funcionário | Operações protegidas / exemplo |
| --- | --- | --- | --- | --- |
| `catalog:read` | sim | sim | sim | Catálogo e seletores de compra/venda, locais ativos, opções de pagamento |
| `catalog:write` | sim | sim | não | Criar/editar/inativar categorias, produtos e locais; listar administração de locais |
| `purchases:read` | sim | sim | não | `listPurchases` |
| `purchases:write` | sim | sim | sim | `createPurchase` |
| `inventory:read` | sim | sim | não | `listInventory`, que expõe custos |
| `sales:read` | sim | sim | não | `listSales` |
| `sales:write` | sim | sim | sim | `createSale`, `deliverSale`, `receiveSalePayment` |
| `expenses:read` / `expenses:write` | sim | sim | não | Consultar e registrar despesas |
| `production:read` / `production:write` | sim | sim | não | Workspace, consulta, prévia, criação e conclusão de lote |
| `reports:financial:read` | sim | sim | não | `getOperationalReports`, `getFinancialOverview` |
| `dashboard:read` | sim | sim | não | `getDashboard` |
| `financial:compensation:write` | sim | sim | não | `compensateDeliveredSale`, `redeemStoreCredit`, `returnSaleLifecycle` |
| `financial:period:close` | sim | não | não | `closeFinancialPeriod` |
| `financial:period:correct` | sim | não | não | `correctFinancialEvent` |
| `fifo:lifecycle:write` | sim | não | não | Cancelamento FIFO, perda, ajustes positivo/negativo |
| `fifo:audit:read` | sim | não | não | `getFifoMigrationAudit` |
| `scenarios:read` | sim | sim | não | `listScenarios` |
| `scenarios:write` | sim | não | não | Criar, editar, versionar, ativar e arquivar cenários |
| `access:manage` | sim | não | não | Configurações, diagnóstico SQL controlado e planos de ação |

A aprovação G2 permite compensações ao Gerente e correção de período fechado
somente ao Dono. A implementação atual restringe também o fechamento ao Dono;
esta tabela não amplia o acordo de negócio. A permissão `sales:write` inclui
entrega e recebimento conforme o código atual, sem conceder `sales:read` ao
Funcionário. Não presumir que poder registrar implica poder listar.

## Rotas e proteção da interface

| Rota | Permissão |
| --- | --- |
| `/` | `dashboard:read` |
| `/categorias`, `/produtos` | `catalog:read` |
| `/locais` | `catalog:write` |
| `/compras` | `purchases:write` |
| `/estoque` | `inventory:read` |
| `/producao` | `production:read` |
| `/vendas` | `sales:write` |
| `/despesas` | `expenses:read` |
| `/relatorios`, `/financeiro` | `reports:financial:read` |
| `/cenarios` | `scenarios:read` |
| `/parametros`, `/diagnostico-conexao`, `/plano-de-acao` | `access:manage` |
| `/fifo-migration-audit` | `fifo:audit:read` |

`/login` e `/login/redefinir-senha` são públicas. Sem sessão autorizada, a
navegação operacional volta a `/login`. Com sessão e papel insuficiente, a
rota redireciona para a página inicial permitida: Dono/Gerente em `/`,
Funcionário em `/compras`. Isso é diferente de mostrar um erro de relatório.

## Decisões ainda separadas

Qualquer delegação adicional de lifecycle FIFO, escopo próprio/por local,
projeções sem custo para papéis legados ou dupla aprovação exige decisão
específica. As permissões atuais não resolvem essas políticas futuras.
