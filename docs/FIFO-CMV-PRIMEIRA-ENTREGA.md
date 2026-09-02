# FIFO de CMV - primeira entrega local

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

## Migration e backfill

`drizzle/0012_fifo_cost_layers.sql` ainda **não foi aplicada**. Ela é portátil:
cria `inventory_cost_layers` e `inventory_cost_allocations` e materializa de
forma idempotente as saídas concluídas de produção. Em banco vazio, ou sem
produção histórica, o backfill genérico não insere linhas. A migration não cita
HML, IDs ou dados de homologação.

O backfill HML é separado e opcional: `scripts/backfill-hml-fifo.ts`. Ele não
é importado por migrations, startup ou painel e exige
`--environment development --confirm`. O processo precisa já receber a conexão
de runtime configurada; o script não lê arquivos de ambiente. Antes de escrever
em uma única transação, exige as duas vendas HML, seus itens `PROD003` de
`1.000` a `12.00`, dois movimentos `sale` de `-1.000` e a saída reconciliada
do lote `#18` (`12.000` / `45.33`). O resultado é CMV `3.78` para cada venda e
saldo `10.000` / `37.77`; estado parcial ou divergente aborta sem escrita.

Dados reais de production exigem uma rotina de backfill própria, aprovada e
auditada. Eles não devem reutilizar nem depender da rotina HML.

## Relatórios

Quando houver alocações, relatórios expõem receita líquida alocada, CMV, margem
bruta, margem por produto, margem por lote e estoque valorizado pelas camadas
remanescentes. Resultado financeiro simples continua separado: receita menos
despesas não é margem bruta.

## Fora do escopo desta entrega

Perdas, ajustes negativos, devoluções, cancelamentos posteriores e produtos
acabados comprados diretamente ainda não consomem/restauram camadas FIFO. Eles
devem entrar numa fase posterior com movimentos compensatórios imutáveis; até
lá, não devem ser tratados como se tivessem CMV FIFO rastreável.

## Fase 2 proposta (implementada localmente, não aplicada)

`drizzle/0013_fifo_lifecycle.sql` é incremental e schema-only: não contém HML,
IDs, backfill ou dados de development. Nesta etapa nenhuma migration, conexão
Neon ou alteração de dados foi executada.

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

Aplicação futura em development: backup lógico, revisão/aplicação isolada de
`0013`, deploy do escritor, e somente depois scripts de HML futuros separados,
idempotentes e autorizados. Rollback é operacional: parar escritores e
reimplantar a versão anterior; jamais apagar fatos contábeis como rollback.

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
Chaves de origem tornam perda e ajustes idempotentes por referência. A UI e
qualquer homologação em banco seguem fora do escopo desta alteração local.

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
de verdade e a ausência de `0013` recebe orientação operacional explícita.
Esta UI não foi homologada em banco nesta etapa.

## Rollback prático

Em uma aplicação futura, interrompa novas confirmações/pagamentos e publique
uma versão que ignore as tabelas FIFO. Preserve as alocações para auditoria;
não há rollback automático que apague fatos contábeis.
