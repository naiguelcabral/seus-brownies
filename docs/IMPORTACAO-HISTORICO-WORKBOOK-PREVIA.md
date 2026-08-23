# Prévia de importação do histórico do workbook

Gerado pelo comando `npm run import:history:preview -- <caminho-do-workbook> --year 2026`. O workbook foi somente lido; nenhum dado foi gravado no banco e nenhuma migration foi aplicada.

## Fonte auditada

- Arquivo: `Workbook_Gerenciamento_Seus_Brownies.xlsx`
- SHA-256: `25aa62df5fc9b2e01402e9c242142322d9c6f54a345e800cb947b77865ce5b64`
- Manifesto versionado: `data/importacao-compras-aliases.json` (versão 2).
- Abas lidas: `04_Cadastro_Locais`, `05_Base_Vendas`, `07_Base_Compras_Despesas`, `08_Estoque_Insumos` e `09_Producao_Fornadas`.
- `08_Estoque_Insumos` é derivada das compras e foi usada apenas para conferência (23 linhas), nunca como segunda origem.

## Decisões incorporadas

- Todas as compras e despesas são datadas em **2026**.
- Os cinco locais/canais serão importados como **não classificados** e podem ser editados depois.
- As 15 vendas históricas são exclusivamente financeiras (`affects_stock = false`): não criarão movimentações de estoque.
- Os 17 registros `PLAN` permanecem planejamento, sem lote real, produção ou movimentação.
- Energia e mão de obra continuam fora do estoque; não há linha histórica dessas naturezas.

## Contagens e situação

| Fonte | Encontrados | Destino futuro | Situação |
| --- | ---: | --- | --- |
| Locais/canais | 5 | `sales_locations` | pronto como não classificado |
| Eventos de venda | 15 | `sales` | financeiro, sem estoque |
| Itens de venda | 182 | `sale_items` | IDs de produto válidos |
| Compras de estoque | 23 | `purchases`, `purchase_items`, `stock_movements` | 23 aprovadas; 0 bloqueiam a transação |
| Despesas | 7 | `expenses` | datadas em 2026; aguardam liberação global |
| Produção real | 0 | `production_batches` | não importar |
| Planejamentos `PLAN` | 17 | planejamento futuro | ignorar |

## Locais/canais

| ID fonte | Local/canal | Classificação importada | Status |
| --- | --- | --- | --- |
| LOC001 | CEMTN | Não classificado | ativo |
| LOC002 | ESPLANADA | Não classificado | ativo |
| LOC003 | JAIME | Não classificado | ativo |
| LOC004 | SBS | Não classificado | ativo |
| LOC005 | PATRÍCIA | Não classificado | ativo |

## Vendas financeiras e auditoria

| Evento | Data | Faturamento informado | Itens | Auditoria |
| --- | --- | --- | --- | --- |
| VEND0001 | 2026-06-02 | 936.00 | 13 | OK |
| VEND0002 | 2026-06-03 | 1536.00 | 13 | Crítico |
| VEND0003 | 2026-06-03 | 120.00 | 2 | OK |
| VEND0004 | 2026-06-09 | 715.00 | 11 | OK |
| VEND0005 | 2026-06-11 | 836.00 | 13 | OK |
| VEND0006 | 2026-06-18 | 769.00 | 13 | OK |
| VEND0007 | 2026-06-19 | 1520.00 | 10 | Crítico |
| VEND0008 | 2026-06-23 | 961.00 | 12 | OK |
| VEND0009 | 2026-06-25 | 512.00 | 10 | OK |
| VEND0010 | 2026-06-30 | 727.00 | 15 | OK |
| VEND0011 | 2026-07-02 | 620.00 | 10 | OK |
| VEND0012 | 2026-07-07 | 794.00 | 15 | OK |
| VEND0013 | 2026-07-09 | 1064.00 | 15 | OK |
| VEND0014 | 2026-07-14 | 734.00 | 16 | OK |
| VEND0015 | 2026-07-16 | 635.00 | 14 | OK |

As duas divergências são preservadas como campos de auditoria, sem substituir o faturamento informado:

| Evento | Informado | Calculado | Diferença | Status |
| --- | --- | --- | --- | --- |
| VEND0002 | 1536.00 | 1752.00 | -216.00 | Crítico |
| VEND0007 | 1520.00 | 1739.00 | -219.00 | Crítico |

## Aliases e conversões aprovados

Cada alias valida a quantidade-base da origem e converte `Quantidade_Comprada` para a unidade de estoque. `SAI0020` é a exceção aprovada: sua entrada é direta de 845 g, sem multiplicar campos da planilha.

| Saída | Descrição fonte | Produto de estoque | Tipo / unidade | Conversão aprovada | Entrada calculada |
| --- | --- | --- | --- | --- | --- |
| SAI0001 | SACOLA KRAFT PP | Sacola Kraft PP | packaging / unit | 50 origem → 50 unit por embalagem | 50 |
| SAI0002 | SACOLA KRAFT P | Sacola Kraft P | packaging / unit | 50 origem → 50 unit por embalagem | 50 |
| SAI0003 | SACOLA KRAFT M | Sacola Kraft M | packaging / unit | 100 origem → 100 unit por embalagem | 100 |
| SAI0004 | BISNAGA PARA MOLHO 200ML | Bisnaga para Molho 200 ml | packaging / unit | 12 origem → 12 unit por embalagem | 12 |
| SAI0006 | RECH MOCA 1,01kg BRI | Brigadeiro (Recheio) | ingredient / g | 1.01 origem → 1010 g por embalagem | 5050 |
| SAI0007 | REC ALISP 1,01kg AVE | Recheio Alispec Avelã — Forneável | ingredient / g | 1.01 origem → 1010 g por embalagem | 4040 |
| SAI0008 | OLEO DE SOJA LIZA PET 900ML | Óleo | ingredient / ml | 900 origem → 900 ml por embalagem | 10800 |
| SAI0009 | RECHEIO NESTLE COBRT NINHO 2,61KG | Leite Ninho (Recheio) | ingredient / g | 2.61 origem → 2610 g por embalagem | 5220 |
| SAI0015 | OVOS GRANDE BCO 30UN | Ovos Grandes | ingredient / unit | 30 origem → 30 unit por embalagem | 150 |
| SAI0016 | DOCE DE LEITE ITAMBÉ 5KG | Doce de Leite (Recheio) | ingredient / g | 5 origem → 5000 g por embalagem | 5000 |
| SAI0017 | REC ALISP 1,01kg AVE | Recheio Alispec Avelã — Não forneável | ingredient / g | 1.01 origem → 1010 g por embalagem | 3030 |
| SAI0018 | LEITE COND MOÇA LA | Leite Condensado | ingredient / g | 395 origem → 395 g por embalagem | 1185 |
| SAI0019 | CR LEI NEST 200G | Creme de Leite | ingredient / g | 200 origem → 200 g por embalagem | 600 |
| SAI0020 | MARACUJÁ | Maracujá (Recheio) | ingredient / g | entrada direta de 845 g | 845 |
| SAI0021 | OVO BCO GRANDE C/ 30 | Ovos Grandes | ingredient / unit | 30 origem → 30 unit por embalagem | 120 |
| SAI0022 | COB HARALD TOP GOTAS LEITE | Chocolate Ao Leite / Branco | ingredient / g | 1.01 origem → 1010 g por embalagem | 1010 |
| SAI0023 | CHOC PÓ HARALD MELKEN 50% | Chocolate | ingredient / g | 1.01 origem → 1010 g por embalagem | 5050 |
| SAI0025 | RECHEIO COBERT MOÇA BRIGADEIRO | Brigadeiro (Recheio) | ingredient / g | 1.01 origem → 1010 g por embalagem | 3030 |
| SAI0026 | RECHEIO NESTLE COBRT NINHO 2,61KG | Leite Ninho (Recheio) | ingredient / g | 2.61 origem → 2610 g por embalagem | 2610 |
| SAI0027 | PAPEL MANTEIGA WYDA | Papel Manteiga (rolo) | packaging / m | 7 origem → 7 m por embalagem | 7 |
| SAI0028 | OVO C/ 20 | Ovos Grandes | ingredient / unit | 20 origem → 20 unit por embalagem | 80 |
| SAI0029 | SACOLA KRAFT PEQUENA 12X8,5X16 | Sacola Kraft 12 × 8,5 × 16 cm | packaging / unit | 100 origem → 100 unit por embalagem | 100 |
| SAI0030 | CHOCOLATE EM PÓ 50% MELKEN | Chocolate | ingredient / g | 1.01 origem → 1010 g por embalagem | 12120 |

Sacolas só são equivalentes quando material e dimensões normalizadas coincidem exatamente. `PP`, `P`, `M` e `12 × 8,5 × 16 cm` são quatro produtos distintos.

## Produtos necessários no catálogo

| SKU previsto | Produto | Tipo | Unidade |
| --- | --- | --- | --- |
| HIS-BISNAGA-MOLHO-200ML | Bisnaga para Molho 200 ml | packaging | unit |
| HIS-CREME-DE-LEITE | Creme de Leite | ingredient | g |
| HIS-LEITE-CONDENSADO | Leite Condensado | ingredient | g |
| HIS-OVOS-GRANDES | Ovos Grandes | ingredient | unit |
| HIS-RECHEIO-ALISPEC-AVELA-FORNEAVEL | Recheio Alispec Avelã — Forneável | ingredient | g |
| HIS-RECHEIO-ALISPEC-AVELA-NAO-FORNEAVEL | Recheio Alispec Avelã — Não forneável | ingredient | g |
| HIS-SACOLA-KRAFT-12-8-5-16 | Sacola Kraft 12 × 8,5 × 16 cm | packaging | unit |
| HIS-SACOLA-KRAFT-M | Sacola Kraft M | packaging | unit |
| HIS-SACOLA-KRAFT-P | Sacola Kraft P | packaging | unit |
| HIS-SACOLA-KRAFT-PP | Sacola Kraft PP | packaging | unit |

Embalagens a criar quando a importação for liberada:

| SKU previsto | Produto | Tipo | Unidade |
| --- | --- | --- | --- |
| HIS-BISNAGA-MOLHO-200ML | Bisnaga para Molho 200 ml | packaging | unit |
| HIS-SACOLA-KRAFT-12-8-5-16 | Sacola Kraft 12 × 8,5 × 16 cm | packaging | unit |
| HIS-SACOLA-KRAFT-M | Sacola Kraft M | packaging | unit |
| HIS-SACOLA-KRAFT-P | Sacola Kraft P | packaging | unit |
| HIS-SACOLA-KRAFT-PP | Sacola Kraft PP | packaging | unit |

Embalagens individuais existentes no catálogo:

| Produto | Catálogo fonte | Regra |
| --- | --- | --- |
| Embalagem Simples 5x5 | presente | consumir 1 unidade no futuro; sem baixa histórica |
| Embalagem Simples 7x7 | presente | consumir 1 unidade no futuro; sem baixa histórica |
| Embalagem Recheado 5x5 | presente | consumir 1 unidade no futuro; sem baixa histórica |
| Embalagem Recheado 7x7 | presente | consumir 1 unidade no futuro; sem baixa histórica |

## Aliases completos — importação liberada para confirmação

Os 23 aliases estão aprovados. Sem `--confirm`, o comando somente atualiza esta prévia e valida os dados; com `--confirm`, a transação ainda interromperá integralmente diante de qualquer ID externo, hash ou incompatibilidade de catálogo já existente.

## Despesas

| Saída | Data | Categoria | Descrição | Valor |
| --- | --- | --- | --- | --- |
| SAI0005 | 2026-05-01 | TESTE / RECHEIO | RECH ALISP 1,01kg CH | 47.80 |
| SAI0010 | 2026-05-24 | ESTRUTURA / LOJA | EXPOSITOR ESCADA 3 DEGRAUS G | 27.90 |
| SAI0011 | 2026-05-31 | ESTRUTURA / ORGANIZAÇÃO | PORTA PAPEL TOALHA | 25.87 |
| SAI0012 | 2026-05-31 | ESTRUTURA / ORGANIZAÇÃO | PORTA MOEDAS | 11.75 |
| SAI0013 | 2026-05-31 | ESTRUTURA / ORGANIZAÇÃO | CAIXA ORGANIZADORA DE DINHEIRO MDF | 22.76 |
| SAI0014 | 2026-06-02 | TESTE / RECHEIO | CREME RECHEIO AVELÃ ALISPEC | 42.00 |
| SAI0024 | 2026-06-20 | TESTE / INGREDIENTES | CHOC EM PÓ QUALICAU | 104.70 |

## Qualidade e itens ignorados

- IDs duplicados: nenhuma duplicidade de ID fonte detectada.
- Campos inválidos: nenhum detectado.
- Itens ignorados: 17 `PLAN` e a aba de estoque derivada. INS020 (energia) e INS021 (mão de obra) não são produtos de estoque.

## Modelagem da migration incremental

1. `sales_locations`, `sales.location_id` e `sales.affects_stock` para locais não classificados e vendas financeiras históricas.
2. IDs externos, hashes e `historical_import_records` para idempotência; qualquer chave ou hash existente interromperá a transação sem sobrescrever dados.
3. `product_import_aliases` com produto alvo e multiplicador decimal para vincular compra, item e movimento de estoque de maneira auditável.
4. Campos de origem em compras, despesas e vendas para preservar valores, auditoria e payloads históricos.
5. `production_batches`, saídas de produção e `operational_costs` para registrar planejamento, produção concluída e custos de energia/mão de obra sem tratá-los como estoque.

Nenhuma migration foi aplicada e a importação com `--confirm` não foi executada.
