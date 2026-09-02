# FIFO de CMV - estado da entrega e homologação

Esta entrega introduz camadas de custo para saídas concluídas de produção e
alocações imutáveis de custo para vendas `confirmed` e `paid`.

## Contrato

- Quantidades usam milésimos (`numeric(14,3)`); totais usam centavos
  (`numeric(12,2)`); `unit_cost` permanece apenas como referência com três
  casas.
- Uma camada nasce de uma saída `production_output` concluída e valorada por
  `allocated_cost`.
- A venda consome as camadas mais antigas por data de conclusão, ID da saída e
  ID da camada. O último consumo recebe todo o custo residual da camada.
- O movimento `sale` recebe o CMV total em `allocated_cost`; o detalhe fica em
  `inventory_cost_allocations`, ligado ao item de venda e à camada de origem.
- A criação da venda bloqueia produtos e camadas em ordem determinística, sem
  `SKIP LOCKED`, e falha integralmente quando a camada não cobre a quantidade.

## Estado aplicado em development

As migrations `0012_fifo_cost_layers.sql` e `0013_fifo_lifecycle.sql` estão
aplicadas exclusivamente em `development`. A auditoria runtime GET-only
confirmou `14` registros no histórico Drizzle e o schema lifecycle completo.
Não há evidência nesta documentação de aplicação, auditoria ou homologação em
`production`.

`0012` cria `inventory_cost_layers` e `inventory_cost_allocations` e
materializa de forma idempotente as saídas concluídas de produção. O backfill
HML separado foi executado anteriormente em `development` para preservar duas
vendas históricas de homologação: as alocações de CMV permanecem em `R$ 3,78`
para cada venda e a camada de `PROD003` do lote `#18` permanece em
`10.000` unidades / `R$ 37,77`.

A migration `0013` é schema-only: não contém HML, IDs, backfill ou DML. Ela
habilita o ciclo lifecycle com origens de camada e reversões imutáveis. Os
snapshots Drizzle de `0012` e `0013` continuam pendentes de higiene em um plano
separado; eles não devem ser criados manualmente durante a operação normal.

Qualquer backfill de dados reais requer uma rotina própria, aprovada e
auditada. Ele não pode reutilizar nem depender dos dados HML.

## Relatórios

Quando houver alocações, relatórios expõem receita líquida alocada, CMV, margem
bruta, margem por produto, margem por lote e estoque valorizado pelas camadas
remanescentes. Resultado financeiro simples continua separado: receita menos
despesas não é margem bruta.

## Limites da homologação atual

A fase 2 possui implementação local para cancelamentos, devoluções, perdas,
ajustes negativos, ajustes positivos e camadas de compra de produto acabado.
Isso não equivale a homologação operacional contínua.

O único cenário lifecycle executado por interface foi um ajuste positivo
autorizado de `PROD003`, referência `HML2-POS-G6-20260902`: movimento `#22` e
camada FIFO `#3`, ambos de `24.000` unidades e `R$ 60,48`. G6 foi uma
pré-checagem GET-only, G8 reconciliou o resultado somente por GET e G9 foi
apenas fechamento documental.

Cancelamento, devolução parcial ou total, devolução acima do permitido, perda,
ajuste negativo, compra de produto acabado, concorrência PostgreSQL, duplo
clique e rollback operacional continuam pendentes de homologação real,
isolada e autorizada. A devolução atualmente recompõe somente estoque/CMV no
desenho local; crédito, reembolso ou estorno de receita continuam decisões
financeiras pendentes e não estão implementados nem homologados.

## Fase 2 — implementação local e schema aplicado

`drizzle/0013_fifo_lifecycle.sql` é incremental e schema-only: não contém HML,
IDs, backfill ou dados de development. A migration está aplicada em
`development`, mas o comportamento abaixo, exceto pelo único ajuste positivo
documentado, ainda requer homologação real por cenário.

- Cancelamentos/devoluções criam fatos de reversão que apontam à alocação
  original; não apagam alocação, restauram a mesma camada e não podem superar
  quantidade/custo original. A devolução recompõe somente estoque/CMV nesta
  fase; eventual crédito financeiro será um fato separado, decisão pendente.
- Perdas e ajustes negativos consomem FIFO global e possuem alocações explícitas
  com motivo e referência. Ajuste positivo exige custo total e referência de
  origem e cria camada `adjustment` identificada.
- Compra de `finished_product` cria camada `purchase`, permitindo consumo FIFO
  misto com produção. A origem da camada deve aparecer em relatórios.
- Locks devem ser por produto e camada em ordem determinística, sem `SKIP
  LOCKED`; movimento, camada, alocação/reversão e saldo pertencem à mesma
  transação. Draft/cancelled não geram nova baixa e não há delete de fatos.

Para cada cenário futuro em `development`, exigir autorização explícita,
referência inédita, pré-auditoria GET-only, execução isolada e reconciliação
posterior. O rollback continua sendo operacional: parar writers/UI e
reimplantar a versão anterior, sem apagar fatos contábeis.

### Writers transacionais locais

Os contratos Zod de `lifecycle-contracts.ts` agora são usados pelos Server
Functions locais de cancelamento, devolução, perda, ajuste negativo e ajuste
positivo. Cada chamada abre uma transação Drizzle e executa uma sonda
somente-leitura da tabela `inventory_cost_reversals` antes de qualquer escrita.
Se `0013` não estiver instalada, a chamada falha com mensagem explícita e não
grava nada.

Os escritores bloqueiam produtos e camadas em ordem crescente (produto,
`available_at`, camada), preservam alocações originais e registram reversões
imutáveis. Perdas/ajustes negativos criam movimento e alocações no mesmo
commit; ajuste positivo cria o movimento e sua camada de origem `adjustment`.
Chaves de origem tornam perda e ajustes idempotentes por referência. A única
evidência de operação real por interface é o ajuste positivo de `PROD003`
registrado acima; os demais writers ainda não foram homologados contra
PostgreSQL real.

Os testes locais de persistência usam um mock transacional Drizzle reutilizável.
Ele registra sonda de schema, locks, inserts, updates, commit e rollback, e
cobre cancelamento, devolução parcial, perda multicamada, ajuste negativo
duplicado, ajuste positivo e interrupção antes de escrever quando `0013` está
ausente. Nenhum teste abre conexão com Neon.

O mock também mantém um write set pendente separado das mutations confirmadas.
Para cada etapa alcançável de cada writer (sonda, lock, movimento, alocação,
reversão, camada e atualização de status), uma falha forçada exige rollback,
proíbe commit e descarta o write set. Casos dedicados cobrem repetição de
cancelamento/devolução, devolução acima do saldo restaurável e repetição de
perda, ajuste negativo e positivo pela chave idempotente.

### UI local do ciclo de vida

As telas locais expõem cancelamento com motivo e confirmação apenas para vendas
`confirmed`/`paid`; rascunhos e canceladas não mostram a ação. Estoque possui
formulários separados para devolução por item de venda, perda, ajuste negativo
e ajuste positivo. A interface valida formato e obrigatoriedade, exige
confirmação para saídas e bloqueia novo envio enquanto há operação pendente.
Ela nunca calcula custo FIFO nem presume êxito: o writer continua sendo a fonte
de verdade e a ausência de `0013` recebe orientação operacional explícita. A
interface foi usada somente no ajuste positivo autorizado; os demais fluxos
permanecem sem homologação em banco.

## Rollback prático

Em caso de divergência operacional, interrompa novas confirmações/pagamentos e
publique uma versão que ignore as ações lifecycle. Preserve alocações e
reversões para auditoria; não há rollback automático que apague fatos
contábeis. Este procedimento ainda não foi homologado em incidente real.
