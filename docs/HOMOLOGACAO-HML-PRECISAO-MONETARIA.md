# Homologacao HML - Precisao Monetaria

Data: 2026-08-29

Compra criada pela interface: `HML-20260829-LOTE-01`.

| Registro | ID | Evidencia confirmada |
| --- | ---: | --- |
| Compra | 1 | Total `1.35`; fornecedor e observacao com o prefixo HML |
| Item Farinha de Trigo (`INS004`) | 1 | `240.000 g` x `0.005` = `1.20` |
| Item Embalagem Recheado 5x5 (`INS009`) | 2 | `1.000 un.` x `0.150` = `0.15` |
| Movimento Farinha | 1 | Entrada `240.000`; referencia `purchase:1`; custo `0.005` |
| Movimento Embalagem | 2 | Entrada `1.000`; referencia `purchase:1`; custo `0.150` |

Saldos apurados apos a compra:

- Farinha de Trigo: `240.000 g`.
- Embalagem Recheado 5x5: `1.000 un.`.

A auditoria de leitura confirmou uma unica compra com o prefixo HML.

## Rascunho de producao

Criado pela interface em `development` com a observacao
`HML-20260829-LOTE-PRODUCAO-01`:

| Registro | ID | Evidencia confirmada |
| --- | ---: | --- |
| Lote | 18 | Status `draft`; receita `RECIPE-BASE-001` v1; multiplicador `1.000` |
| Saida principal | 18 | `PROD003` Brownie Recheado 5x5 (Brigadeiro), `12.000 un.` planejadas |
| Coproduto | 19 | `PROD002` Bordinhas, `6.000 un.` planejadas |

A previa anterior ao rascunho confirmou todos os consumos suficientes:
Acucar `500 g`, Farinha `240 g`, Ovos Grandes `8 un.`, Oleo `215 ml`,
Chocolate `300 g`, Papel Manteiga `0.8 m`, Brigadeiro `240 g` e Embalagem
Recheado 5x5 `12 un.`. Custos operacionais visiveis: Energia `0.85` e mao de
obra `25.00`. O custo previsto foi `68.00` e o custo unitario previsto,
`3.78`.

A auditoria somente leitura confirmou, para o lote 18: zero consumos de lote,
zero custos operacionais realizados, zero perdas, zero movimentos de estoque,
quantidade realizada nula e custos persistidos nulos. A contagem do prefixo do
rascunho e `1`; os saldos de insumos e produtos permaneceram inalterados pela
criacao do rascunho.

## Conclusao do lote

O lote `18` foi concluido uma unica vez pela interface em `2026-08-29
22:16:43.810+00`. O status final e `completed`, a quantidade realizada e
`18.000`, o custo total e `68.00` e o custo unitario e `3.778`.

| Fato | IDs | Evidencia confirmada |
| --- | --- | --- |
| Consumos | 1 a 8 | Baixas de Acucar, Farinha, Ovos, Oleo, Chocolate, Papel Manteiga, Brigadeiro e Embalagem |
| Custos operacionais | 1, 2 | Energia `0.85` e mao de obra `25.00` com as tarifas vigentes aplicadas |
| Saidas | 18, 19 | `PROD003` `12.000 un.` e `PROD002` Bordinhas `6.000 un.` |
| Movimentos | 10 a 17 | Baixas de producao com `reference_type=production_consumption` e `reference_id=18` |
| Movimentos | 18, 19 | Entradas de producao com `reference_type=production_output` e `reference_id=18` |

Saldos apos a conclusao: todos os oito insumos ficaram em `0`; `PROD003`
ficou em `12.000 un.` e Bordinhas em `6.000 un.`. Nao houve perdas. A tela de
auditoria do lote concluido nao oferece o botao de conclusao novamente, o que
foi confirmado visualmente sem enviar uma segunda chamada.

## Rateio exato das saidas

Em 2026-08-29, a migration `0011_demonic_redwing` foi aplicada somente em
`development`. O historico Drizzle passou a ter 12 registros e contem uma unica
ocorrencia do hash
`4ec5efaa97d0f8ffa474a2780ee7a5d05c0b4c1e6d915594c68b15be6659875f`.

As colunas `production_batch_outputs.allocated_cost` e
`stock_movements.allocated_cost` foram confirmadas como `numeric(12,2)`. O
backfill do lote concluido `18` preservou status, quantidade realizada
`18.000`, custo total `68.00`, oito consumos e zero perdas, com o seguinte
rateio persistido:

| Saida | ID da saida | ID do movimento | Quantidade | `unit_cost` | `allocated_cost` |
| --- | ---: | ---: | ---: | ---: | ---: |
| `PROD003` Brownie Recheado 5x5 (Brigadeiro) | 18 | 18 | `12.000` | `3.778` | `45.33` |
| `PROD002` Bordinhas | 19 | 19 | `6.000` | `3.778` | `22.67` |

Os dois movimentos mantem `reference_type=production_output` e
`reference_id=18`. A valorizacao combinada dos saldos finais e exatamente
`68.00`, sem o desvio anterior para `68.01`. A compra de Farinha HML manteve
`purchase_item` 1 e movimento 1, ambos com custo unitario `0.005` e sem
`allocated_cost`.

## Primeira venda HML

Em 2026-08-29 foi criada pela interface a venda `HML-20260829-VENDA-01`.

| Registro | ID | Evidencia confirmada |
| --- | ---: | --- |
| Venda | 1 | Status `confirmed`; cliente e observacao com o prefixo HML |
| Item | 1 | `PROD003` Brownie Recheado 5x5 (Brigadeiro), `1.000 un.`, preco snapshot `12.00` |
| Movimento | 20 | `sale`, `-1.000`, `reference_type=sale`, `reference_id=1` |

A tela confirmou a baixa de estoque e exibiu a venda na lista. Os saldos apos
o registro sao `PROD003` `11.000 un.` e `PROD002` Bordinhas `6.000 un.`. O
movimento de venda nao registra `unit_cost` nem `allocated_cost`.

Foi identificada uma divergencia a investigar antes de outra venda: embora o
preco snapshot do item seja `12.00`, o subtotal, total do item e total da venda
foram persistidos e exibidos como `1.20`; desconto e taxa de entrega ficaram
em `0.00`. Nenhuma correcao, cancelamento ou nova venda foi executada nesta
homologacao.

## Correcao local do calculo de vendas

Foi corrigido localmente o calculo aplicado a novas vendas. O defeito passava
um preco em centavos a uma formula destinada a custo unitario em milesimos de
real, reduzindo por dez o total de `12.00 x 1.000`. O codigo agora mantem
contratos separados: `priceCents x quantityThousandths -> totalCents` para
vendas e `unitCostMillis x quantityThousandths -> totalCents` para compras.

Esta alteracao nao abriu conexao com o banco, nao aplicou migration e nao
reparou a venda HML #1. A correcao dos valores historicos requer uma etapa
posterior, explicitamente autorizada, sem alterar sua baixa de estoque.

## Reparacao financeira da venda HML #1

Em etapa posterior autorizada, a venda `1` foi auditada antes da escrita. As
pre-condicoes confirmadas foram: um unico item `PROD003`, quantidade `1.000`,
preco snapshot `12.00`, subtotal e totais em `1.20`, desconto e entrega em
`0.00`, e o unico movimento `sale` `20` de `-1.000` vinculado a venda.

Uma transacao alterou somente `sales.subtotal_amount`, `sales.total_amount` e
`sale_items.total_amount` para `12.00`. Cliente, observacao, status, data,
preco snapshot e movimento de estoque permaneceram inalterados. A auditoria
posterior confirmou os tres totais em `12.00` e o movimento `20` intacto.

A tentativa da venda de correcao `HML-20260829-VENDA-CORRECAO-01` nao criou
registro: o Vite recarregou a pagina porque o relatorio HTML do Playwright foi
escrito em diretorio observado. Nao houve nova tentativa; os saldos mantiveram
`PROD003` em `11.000` e Bordinhas em `6.000`.

Em uma segunda tentativa, os artefatos do Playwright foram movidos para
`/tmp/seus-brownies-playwright` e a fumaça sem envio passou. A submissao ainda
nao confirmou e nao criou registro. O log da mesma instancia isolada comprovou
erro de hidratacao na tela de vendas: o SSR exibiu `29/08/2026, 23:09` e o
cliente exibiu `29/08/2026, 20:09`. A homologacao da venda permanece bloqueada
ate que essa divergencia de fuso seja corrigida e validada em etapa separada.

## Venda HML de correcao

Depois da correcao da hidratacao, a venda
`HML-20260829-VENDA-CORRECAO-01` foi criada uma unica vez pela interface.

| Registro | ID | Evidencia confirmada |
| --- | ---: | --- |
| Venda | 2 | Status `confirmed`; cliente e observacao com o prefixo HML |
| Item | 2 | `PROD003`, `1.000 un.`, preco snapshot e total `12.00` |
| Movimento | 21 | `sale`, `-1.000`, `reference_type=sale`, `reference_id=2` |

Subtotal, desconto, entrega e total da venda sao respectivamente `12.00`,
`0.00`, `0.00` e `12.00`. A venda HML 1 permaneceu em `12.00`. Cada prefixo
de venda HML aparece uma unica vez; o faturamento confirmado e `24.00` e as
duas vendas registram `2.000` unidades de `PROD003`. Os saldos finais sao
`PROD003` `10.000` e Bordinhas `6.000`.

## Despesa HML

A despesa `HML-20260829-DESPESA-01` foi criada uma unica vez pela interface.

| Registro | ID | Evidencia confirmada |
| --- | ---: | --- |
| Despesa | 1 | Categoria `Homologacao HML`, valor `1.00`, data `2026-08-30` |

A descricao e as observacoes contem o prefixo HML. A auditoria confirmou zero
movimentos de estoque vinculados, `PROD003` em `10.000` e Bordinhas em
`6.000`. No periodo, despesas totais e por categoria sao `1.00`; o faturamento
confirmado permanece `24.00`, resultando em saldo operacional inferido de
`23.00` antes de outros criterios nao modelados.

## Consolidacao final

O ciclo `compra -> estoque -> producao -> venda -> despesa -> relatorios` foi
homologado em `development`. A compra HML 1 preserva Farinha a `0.005`; o lote
18 permanece `completed`, sem perdas, com oito consumos, dois custos
operacionais e custo total `68.00`. Os custos alocados das saidas sao `45.33`
para `PROD003` e `22.67` para Bordinhas, cuja soma e `68.00`.

As vendas HML 1 e 2 sao `confirmed`, ambas com total `12.00`, itens `PROD003`
de `1.000` e movimentos de venda 20 e 21. A despesa HML 1 e financeira, sem
movimento de estoque. O faturamento confirmado de `24.00` menos despesas de
`1.00` resulta em `23.00` de resultado financeiro simples. Isso nao constitui
margem realizada: o modelo nao possui vinculo entre uma venda e um lote de
producao.

Os saldos finais confirmados sao `PROD003` `10.000` e Bordinhas `6.000`, sem
saldo negativo. As migrations aplicadas chegam a `0011_demonic_redwing.sql`:
os cinco `unit_cost` relevantes usam `numeric(12,3)` e os dois
`allocated_cost` de producao usam `numeric(12,2)`. Os dados HML devem ser
preservados em `development` como trilha de auditoria.
