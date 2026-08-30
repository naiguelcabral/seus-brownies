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

## Rollback prático

Em uma aplicação futura, interrompa novas confirmações/pagamentos e publique
uma versão que ignore as tabelas FIFO. Preserve as alocações para auditoria;
não há rollback automático que apague fatos contábeis.
