# Prévia de produção, fichas técnicas e custos operacionais

Gerado em modo somente leitura por `npm run production:preview -- <caminho-do-workbook>`. O workbook não foi alterado, nenhuma migration foi criada, nenhuma conexão com o Neon foi aberta e nenhum dado foi importado.

## Fonte e limite de reconciliação

- Arquivo: `Workbook_Gerenciamento_Seus_Brownies.xlsx`
- SHA-256: `a1946fbf1c88b1ec286022c713551ef71b4954fece5d9e36c23f1564233a6f66`
- Abas analisadas: `01_Parametros`, `02_Cadastro_Produtos`, `03_Cadastro_Insumos` e `09_Producao_Fornadas`.
- O cruzamento usa os IDs e nomes normalizados do catálogo-fonte que originou o catálogo já importado (17 produtos finais e 19 itens físicos), o manifesto de 23 aliases de compra e `data/receita-base-vinculos.json` (versão 3). Como esta prévia é offline, uma futura importação deve repetir a conferência por SKU no banco e interromper diante de divergência.

## Classificação estrita dos dados

| Classe | Origem | Encontrados | Tratamento nesta prévia |
| --- | --- | ---: | --- |
| Ficha técnica | `03_Cadastro_Insumos` | 1 receita-base / 7 componentes | não é movimentação de estoque |
| Planejamento | `09_Producao_Fornadas` | 17 `PLAN` | não importar como produção real |
| Produção real | `09_Producao_Fornadas` | 0 | exige data, quantidade real e confirmação |
| Perdas | `09_Producao_Fornadas` | 0 | não há dado histórico para importar |
| Custos operacionais | `03_Cadastro_Insumos` | 2 recursos / 2 linhas na receita | energia e mão de obra, fora do estoque |
| Movimento de estoque | — | 0 | só poderá nascer de lote concluído e confirmado |

## Produtos finais e custos de referência

Os cartões dos 17 produtos preservam rendimento e custo unitário calculado; não constituem, sozinhos, fichas técnicas completas por produto.

| ID | Produto | Classe | Unidade | Rendimento/fornada | Custo unitário c/MO |
| --- | --- | --- | --- | --- | --- |
| PROD001 | Bombom Brownie Unitário | produto final | unit | 77 | 1.68 |
| PROD002 | Bordinhas | produto final | unit | 12 | 2.88 |
| PROD003 | Brownie Recheado 5x5 (Brigadeiro) | produto final | unit | 24 | 2.52 |
| PROD004 | Brownie Recheado 5x5 (Creme de Avelã) | produto final | unit | 24 | 2.22 |
| PROD005 | Brownie Recheado 5x5 (Doce de Leite) | produto final | unit | 24 | 2.26 |
| PROD006 | Brownie Recheado 5x5 (Goiabada) | produto final | unit | 24 | 1.96 |
| PROD007 | Brownie Recheado 5x5 (Leite Ninho) | produto final | unit | 24 | 2.77 |
| PROD008 | Brownie Recheado 5x5 (Maracujá) | produto final | unit | 24 | 2.22 |
| PROD009 | Brownie Recheado 7x7 (Brigadeiro) | produto final | unit | 12 | 4.77 |
| PROD010 | Brownie Recheado 7x7 (Creme de avelã) | produto final | unit | 12 | 4.17 |
| PROD011 | Brownie Recheado 7x7 (Doce de Leite) | produto final | unit | 12 | 4.25 |
| PROD012 | Brownie Recheado 7x7 (Goiabada) | produto final | unit | 12 | 3.65 |
| PROD013 | Brownie Recheado 7x7 (Leite Ninho) | produto final | unit | 12 | 5.28 |
| PROD014 | Brownie Recheado 7x7 (Maracujá) | produto final | unit | 12 | 4.17 |
| PROD015 | Brownie Simples 5x5 | produto final | unit | 48 | 0.92 |
| PROD016 | Brownie Simples 7x7 | produto final | unit | 24 | 1.62 |
| PROD017 | Kit 4 Bombons | produto final | unit | 19.25 | 5.99 |

## Insumos e embalagens físicos de referência

| ID | Item | Tipo | Unidade | Custo unitário fonte |
| --- | --- | --- | --- | --- |
| INS001 | Açúcar | ingredient | g | 0.01 |
| INS002 | Óleo | ingredient | ml | 0.01 |
| INS003 | Chocolate | ingredient | g | 0.06 |
| INS004 | Farinha de Trigo | ingredient | g | 0.01 |
| INS005 | Papel Manteiga (rolo) | packaging | m | 0.50 |
| INS006 | Adesivo | packaging | unit | 0.16 |
| INS007 | Embalagem Simples 5x5 | packaging | unit | 0.11 |
| INS008 | Embalagem Simples 7x7 | packaging | unit | 0.15 |
| INS009 | Embalagem Recheado 5x5 | packaging | unit | 0.15 |
| INS010 | Embalagem Recheado 7x7 | packaging | unit | 0.20 |
| INS011 | Embalagem Bombom Unitário | packaging | unit | 0.11 |
| INS012 | Embalagem Kit 4 Bombons | packaging | unit | 0.20 |
| INS013 | Brigadeiro (Recheio) | ingredient | g | 0.04 |
| INS014 | Doce de Leite (Recheio) | ingredient | g | 0.03 |
| INS015 | Leite Ninho (Recheio) | ingredient | g | 0.06 |
| INS016 | Creme de Avelã (Recheio) | ingredient | g | 0.03 |
| INS017 | Goiabada (Recheio) | ingredient | g | 0.02 |
| INS018 | Maracujá (Recheio) | ingredient | g | 0.03 |
| INS019 | Chocolate Ao Leite / Branco | ingredient | g | 0.04 |

## Ficha técnica-base detectada

Fonte: bloco `Ficha Técnica - Receita Base` da aba `03_Cadastro_Insumos`. Os vínculos abaixo são somente por igualdade normalizada de nome; não há aproximação sem alias explícito.

| Item fonte | ID vinculado | Item de catálogo | Consumo | Unidade | Custo proporcional | Situação |
| --- | --- | --- | --- | --- | --- | --- |
| Ovos | HIS-OVOS-GRANDES | Ovos Grandes | 8 | unit | 5.33 | vínculo técnico aprovado |
| Açúcar | INS001 | Açúcar | 500 | g | 3.00 | vínculo técnico aprovado |
| Óleo (Massa) | INS002 | Óleo | 200 | ml | 1.56 | vínculo técnico aprovado |
| Chocolate Meio Amargo | INS003 | Chocolate | 300 | g | 18.00 | vínculo técnico aprovado |
| Farinha de Trigo | INS004 | Farinha de Trigo | 240 | g | 1.20 | vínculo técnico aprovado |
| Óleo (Untar) | INS002 | Óleo | 15 | ml | 0.12 | vínculo técnico aprovado |
| Papel Manteiga | INS005 | Papel Manteiga (rolo) | 0.8 | m | 0.40 | vínculo técnico aprovado |

Itens sem vínculo explícito:

Nenhum item.

Totais preservados na fonte: sem mão de obra R$ 29.65; com mão de obra R$ 31.35.

## Embalagens individuais aprovadas

| Produto final | Produto | Embalagem | Item | Consumo futuro |
| --- | --- | --- | --- | --- |
| PROD003 | Brownie Recheado 5x5 (Brigadeiro) | INS009 | Embalagem Recheado 5x5 | 1 unit por brownie; regra aprovada |
| PROD004 | Brownie Recheado 5x5 (Creme de Avelã) | INS009 | Embalagem Recheado 5x5 | 1 unit por brownie; regra aprovada |
| PROD005 | Brownie Recheado 5x5 (Doce de Leite) | INS009 | Embalagem Recheado 5x5 | 1 unit por brownie; regra aprovada |
| PROD006 | Brownie Recheado 5x5 (Goiabada) | INS009 | Embalagem Recheado 5x5 | 1 unit por brownie; regra aprovada |
| PROD007 | Brownie Recheado 5x5 (Leite Ninho) | INS009 | Embalagem Recheado 5x5 | 1 unit por brownie; regra aprovada |
| PROD008 | Brownie Recheado 5x5 (Maracujá) | INS009 | Embalagem Recheado 5x5 | 1 unit por brownie; regra aprovada |
| PROD009 | Brownie Recheado 7x7 (Brigadeiro) | INS010 | Embalagem Recheado 7x7 | 1 unit por brownie; regra aprovada |
| PROD010 | Brownie Recheado 7x7 (Creme de avelã) | INS010 | Embalagem Recheado 7x7 | 1 unit por brownie; regra aprovada |
| PROD011 | Brownie Recheado 7x7 (Doce de Leite) | INS010 | Embalagem Recheado 7x7 | 1 unit por brownie; regra aprovada |
| PROD012 | Brownie Recheado 7x7 (Goiabada) | INS010 | Embalagem Recheado 7x7 | 1 unit por brownie; regra aprovada |
| PROD013 | Brownie Recheado 7x7 (Leite Ninho) | INS010 | Embalagem Recheado 7x7 | 1 unit por brownie; regra aprovada |
| PROD014 | Brownie Recheado 7x7 (Maracujá) | INS010 | Embalagem Recheado 7x7 | 1 unit por brownie; regra aprovada |
| PROD015 | Brownie Simples 5x5 | INS007 | Embalagem Simples 5x5 | 1 unit por brownie; regra aprovada |
| PROD016 | Brownie Simples 7x7 | INS008 | Embalagem Simples 7x7 | 1 unit por brownie; regra aprovada |

Essas regras consomem uma unidade por brownie compatível apenas quando existir lote real confirmado. Não geram baixa histórica nem baixas a partir de vendas.

## Perfis de produção extraídos

Os 17 perfis usam a única receita-base e preservam corte, rendimento e recheio da fonte. Os componentes adicionais de recheio pertencem ao perfil, não à receita-base.

| Produto | Nome | Corte/tamanho | Rendimento esperado | Recheio | Embalagem individual |
| --- | --- | --- | --- | --- | --- |
| PROD001 | Bombom Brownie Unitário | Unitário | 77 | — | sem embalagem individual |
| PROD002 | Bordinhas | sem corte informado | 12 | — | sem embalagem individual |
| PROD003 | Brownie Recheado 5x5 (Brigadeiro) | 5x5 | 24 | Brigadeiro | Embalagem Recheado 5x5 |
| PROD004 | Brownie Recheado 5x5 (Creme de Avelã) | 5x5 | 24 | Creme De Avelã | Embalagem Recheado 5x5 |
| PROD005 | Brownie Recheado 5x5 (Doce de Leite) | 5x5 | 24 | Doce De Leite | Embalagem Recheado 5x5 |
| PROD006 | Brownie Recheado 5x5 (Goiabada) | 5x5 | 24 | Goiabada | Embalagem Recheado 5x5 |
| PROD007 | Brownie Recheado 5x5 (Leite Ninho) | 5x5 | 24 | Leite Ninho | Embalagem Recheado 5x5 |
| PROD008 | Brownie Recheado 5x5 (Maracujá) | 5x5 | 24 | Maracujá | Embalagem Recheado 5x5 |
| PROD009 | Brownie Recheado 7x7 (Brigadeiro) | 7x7 | 12 | Brigadeiro | Embalagem Recheado 7x7 |
| PROD010 | Brownie Recheado 7x7 (Creme de avelã) | 7x7 | 12 | Creme De Avelã | Embalagem Recheado 7x7 |
| PROD011 | Brownie Recheado 7x7 (Doce de Leite) | 7x7 | 12 | Doce De Leite | Embalagem Recheado 7x7 |
| PROD012 | Brownie Recheado 7x7 (Goiabada) | 7x7 | 12 | Goiabada | Embalagem Recheado 7x7 |
| PROD013 | Brownie Recheado 7x7 (Leite Ninho) | 7x7 | 12 | Leite Ninho | Embalagem Recheado 7x7 |
| PROD014 | Brownie Recheado 7x7 (Maracujá) | 7x7 | 12 | Maracujá | Embalagem Recheado 7x7 |
| PROD015 | Brownie Simples 5x5 | 5x5 | 48 | — | Embalagem Simples 5x5 |
| PROD016 | Brownie Simples 7x7 | 7x7 | 24 | — | Embalagem Simples 7x7 |
| PROD017 | Kit 4 Bombons | sem corte informado | 19.25 | — | sem embalagem individual |

### Componentes adicionais de recheio por perfil

O tipo de recheio está explicitamente registrado em `02_Cadastro_Produtos!E7:E18` e foi vinculado estritamente aos seis insumos abaixo. As quantidades foram definidas pela decisão operacional aprovada `OPDEC-PROFILE-FILLINGS-2026-001`: 20 g para os brownies 5×5 e 40 g para os 7×7. Elas **não** foram extraídas do workbook e não foram inferidas de preço, custo ou rendimento.

| SKU final | Produto | SKU recheio | Recheio de estoque | Quantidade | Unidade | Tipo na fonte | Cadastro do insumo | Origem da quantidade | Situação |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PROD003 | Brownie Recheado 5x5 (Brigadeiro) | INS013 | Brigadeiro (Recheio) | 20 | g | 02_Cadastro_Produtos!E7 | 03_Cadastro_Insumos!B17:E17 | OPDEC-PROFILE-FILLINGS-2026-001 | approved_operational_decision |
| PROD004 | Brownie Recheado 5x5 (Creme de Avelã) | INS016 | Creme de Avelã (Recheio) | 20 | g | 02_Cadastro_Produtos!E8 | 03_Cadastro_Insumos!B20:E20 | OPDEC-PROFILE-FILLINGS-2026-001 | approved_operational_decision |
| PROD005 | Brownie Recheado 5x5 (Doce de Leite) | INS014 | Doce de Leite (Recheio) | 20 | g | 02_Cadastro_Produtos!E9 | 03_Cadastro_Insumos!B18:E18 | OPDEC-PROFILE-FILLINGS-2026-001 | approved_operational_decision |
| PROD006 | Brownie Recheado 5x5 (Goiabada) | INS017 | Goiabada (Recheio) | 20 | g | 02_Cadastro_Produtos!E10 | 03_Cadastro_Insumos!B21:E21 | OPDEC-PROFILE-FILLINGS-2026-001 | approved_operational_decision |
| PROD007 | Brownie Recheado 5x5 (Leite Ninho) | INS015 | Leite Ninho (Recheio) | 20 | g | 02_Cadastro_Produtos!E11 | 03_Cadastro_Insumos!B19:E19 | OPDEC-PROFILE-FILLINGS-2026-001 | approved_operational_decision |
| PROD008 | Brownie Recheado 5x5 (Maracujá) | INS018 | Maracujá (Recheio) | 20 | g | 02_Cadastro_Produtos!E12 | 03_Cadastro_Insumos!B22:E22 | OPDEC-PROFILE-FILLINGS-2026-001 | approved_operational_decision |
| PROD009 | Brownie Recheado 7x7 (Brigadeiro) | INS013 | Brigadeiro (Recheio) | 40 | g | 02_Cadastro_Produtos!E13 | 03_Cadastro_Insumos!B17:E17 | OPDEC-PROFILE-FILLINGS-2026-001 | approved_operational_decision |
| PROD010 | Brownie Recheado 7x7 (Creme de avelã) | INS016 | Creme de Avelã (Recheio) | 40 | g | 02_Cadastro_Produtos!E14 | 03_Cadastro_Insumos!B20:E20 | OPDEC-PROFILE-FILLINGS-2026-001 | approved_operational_decision |
| PROD011 | Brownie Recheado 7x7 (Doce de Leite) | INS014 | Doce de Leite (Recheio) | 40 | g | 02_Cadastro_Produtos!E15 | 03_Cadastro_Insumos!B18:E18 | OPDEC-PROFILE-FILLINGS-2026-001 | approved_operational_decision |
| PROD012 | Brownie Recheado 7x7 (Goiabada) | INS017 | Goiabada (Recheio) | 40 | g | 02_Cadastro_Produtos!E16 | 03_Cadastro_Insumos!B21:E21 | OPDEC-PROFILE-FILLINGS-2026-001 | approved_operational_decision |
| PROD013 | Brownie Recheado 7x7 (Leite Ninho) | INS015 | Leite Ninho (Recheio) | 40 | g | 02_Cadastro_Produtos!E17 | 03_Cadastro_Insumos!B19:E19 | OPDEC-PROFILE-FILLINGS-2026-001 | approved_operational_decision |
| PROD014 | Brownie Recheado 7x7 (Maracujá) | INS018 | Maracujá (Recheio) | 40 | g | 02_Cadastro_Produtos!E18 | 03_Cadastro_Insumos!B22:E22 | OPDEC-PROFILE-FILLINGS-2026-001 | approved_operational_decision |

Pendência de quantidade: nenhuma; as 12 regras foram aprovadas como decisão operacional. Esses componentes permanecem sem consumo, lote concluído ou movimento de estoque nesta etapa.

### Bordinhas: saída planejada, não perda

`Bordinhas` aparece como produto final próprio (`PROD002`, `02_Cadastro_Produtos!A6:F6`) e como saída planejada (`PLAN002`, `09_Producao_Fornadas!A6:M6`). A fonte não o registra em `Perdas_Qtd` ou `Perdas_%`; portanto, ele deve ser tratado como coproduto do lote, nunca como perda. O workbook não contém, contudo, uma chave que relacione esse coproduto a uma fornada específica, o que deverá ser modelado na próxima etapa.

## Planejamentos e produção realizada

| Plano | ID do produto | Produto | Fornadas | Rendimento previsto | Quantidade prevista | Custo estimado | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLAN001 | PROD001 | Bombom Brownie Unitário | 1 | 77 | 19 | 31.86 | Planejado |
| PLAN002 | PROD002 | Bordinhas | 3 | 12 | 29 | 83.58 | Planejado |
| PLAN003 | PROD003 | Brownie Recheado 5x5 (Brigadeiro) | 1 | 24 | 17 | 42.77 | Planejado |
| PLAN004 | PROD004 | Brownie Recheado 5x5 (Creme de Avelã) | 2 | 24 | 32 | 70.91 | Planejado |
| PLAN005 | PROD005 | Brownie Recheado 5x5 (Doce de Leite) | 2 | 24 | 32 | 72.19 | Planejado |
| PLAN006 | PROD006 | Brownie Recheado 5x5 (Goiabada) | 2 | 24 | 31 | 60.64 | Planejado |
| PLAN007 | PROD007 | Brownie Recheado 5x5 (Leite Ninho) | 1 | 24 | 17 | 47.09 | Planejado |
| PLAN008 | PROD008 | Brownie Recheado 5x5 (Maracujá) | 2 | 24 | 32 | 70.91 | Planejado |
| PLAN009 | PROD009 | Brownie Recheado 7x7 (Brigadeiro) | 2 | 12 | 13 | 62.04 | Planejado |
| PLAN010 | PROD010 | Brownie Recheado 7x7 (Creme de avelã) | 1 | 12 | 12 | 50.07 | Planejado |
| PLAN011 | PROD011 | Brownie Recheado 7x7 (Doce de Leite) | 1 | 12 | 12 | 51.03 | Planejado |
| PLAN012 | PROD012 | Brownie Recheado 7x7 (Goiabada) | 1 | 12 | 12 | 43.83 | Planejado |
| PLAN013 | PROD013 | Brownie Recheado 7x7 (Leite Ninho) | 1 | 12 | 6 | 31.68 | Planejado |
| PLAN014 | PROD014 | Brownie Recheado 7x7 (Maracujá) | 1 | 12 | 12 | 50.07 | Planejado |
| PLAN015 | PROD015 | Brownie Simples 5x5 | 2 | 48 | 61 | 56.30 | Planejado |
| PLAN016 | PROD016 | Brownie Simples 7x7 | 2 | 24 | 48 | 77.57 | Planejado |
| PLAN017 | PROD017 | Kit 4 Bombons | 1 | 19.25 | 6 | 35.93 | Planejado |

Total planejado: 391 unidades; custo estimado preservado: R$ 938.47. Produção real detectada: 0.

## Custos operacionais, fora do estoque

| ID | Recurso cadastrado | Tipo | Base | Unidade | Custo unitário |
| --- | --- | --- | --- | --- | --- |
| INS020 | Forno Elétrico (Tarifa kWh média) | energy | 1 | kWh | 0.85 |
| INS021 | Mão de Obra (Salário Referência) | labor | 160 | horas | 12.50 |

| Linha da ficha | Consumo | Unidade | Custo na ficha | Tipo |
| --- | --- | --- | --- | --- |
| Energia Forno Elétrico (1kWh) | 1 | kWh | 0.04 | energy |
| Custo de Mão de Obra (2 horas por fornada) | 2 | horas | 1.70 | labor |

Energia e mão de obra são custos operacionais: nunca são produtos, itens de receita físicos ou movimentações de estoque.

### Tarifas operacionais vigentes aprovadas

| ID de origem | Recurso fonte | Tipo | Unidade | Valor unitário | Vigente desde |
| --- | --- | --- | --- | --- | --- |
| OPRATE-ENERGY-2026-001 | INS020 | energy | kWh | R$ 0.85 | 2026-01-01 |
| OPRATE-LABOR-2026-001 | INS021 | labor | hour | R$ 12.50 | 2026-01-01 |

As tarifas acima serão importadas junto da receita, em uma única transação, com ID, hash e payload de origem. `historicalCost` das linhas da ficha (energia R$ 0.04 e mão de obra R$ 1.70) continua sendo apenas referência histórica auditável. Um lote concluído futuro deverá selecionar a tarifa do mesmo tipo cuja vigência seja a mais recente até a data do lote e registrar a tarifa selecionada no custo operacional.

O parâmetro `Custos_Fixos_Mensais` é R$ 2200.00; a fonte não define rateio desse valor para fichas ou lotes.

## Aliases e conversões de compras já aprovados

O manifesto `data/importacao-compras-aliases.json` contém 23 aliases aprovados e 18 SKUs-alvo. Os sete vínculos técnicos da ficha-base ficam no manifesto versionado `data/receita-base-vinculos.json`; nenhum vínculo usa semelhança de nome.

| ID de saída | SKU alvo | Produto alvo | Unidade alvo | Multiplicador |
| --- | --- | --- | --- | --- |
| SAI0001 | HIS-SACOLA-KRAFT-PP | Sacola Kraft PP | unit | 50 |
| SAI0002 | HIS-SACOLA-KRAFT-P | Sacola Kraft P | unit | 50 |
| SAI0003 | HIS-SACOLA-KRAFT-M | Sacola Kraft M | unit | 100 |
| SAI0004 | HIS-BISNAGA-MOLHO-200ML | Bisnaga para Molho 200 ml | unit | 12 |
| SAI0006 | INS013 | Brigadeiro (Recheio) | g | 1010 |
| SAI0007 | HIS-RECHEIO-ALISPEC-AVELA-FORNEAVEL | Recheio Alispec Avelã — Forneável | g | 1010 |
| SAI0008 | INS002 | Óleo | ml | 900 |
| SAI0009 | INS015 | Leite Ninho (Recheio) | g | 2610 |
| SAI0015 | HIS-OVOS-GRANDES | Ovos Grandes | unit | 30 |
| SAI0016 | INS014 | Doce de Leite (Recheio) | g | 5000 |
| SAI0017 | HIS-RECHEIO-ALISPEC-AVELA-NAO-FORNEAVEL | Recheio Alispec Avelã — Não forneável | g | 1010 |
| SAI0018 | HIS-LEITE-CONDENSADO | Leite Condensado | g | 395 |
| SAI0019 | HIS-CREME-DE-LEITE | Creme de Leite | g | 200 |
| SAI0020 | INS018 | Maracujá (Recheio) | g | 1 |
| SAI0021 | HIS-OVOS-GRANDES | Ovos Grandes | unit | 30 |
| SAI0022 | INS019 | Chocolate Ao Leite / Branco | g | 1010 |
| SAI0023 | INS003 | Chocolate | g | 1010 |
| SAI0025 | INS013 | Brigadeiro (Recheio) | g | 1010 |
| SAI0026 | INS015 | Leite Ninho (Recheio) | g | 2610 |
| SAI0027 | INS005 | Papel Manteiga (rolo) | m | 7 |
| SAI0028 | HIS-OVOS-GRANDES | Ovos Grandes | unit | 20 |
| SAI0029 | HIS-SACOLA-KRAFT-12-8-5-16 | Sacola Kraft 12 × 8,5 × 16 cm | unit | 100 |
| SAI0030 | INS003 | Chocolate | g | 1010 |

## Inconsistências, duplicidades e decisões pendentes

- IDs duplicados entre catálogo e planejamentos: nenhum.
- Nomes duplicados no bloco de ficha técnica: nenhum.
- Itens de ficha sem vínculo físico explícito: nenhum; os sete vínculos estão aprovados no manifesto técnico.
- Campos/inconsistências: nenhum.
- Diferenças históricas de custo, preservadas apenas para auditoria: Energia: ficha técnica usa R$ 0.04 por 1 kWh; tarifa atual cadastrada é R$ 0.85.; Mão de obra: ficha técnica usa R$ 1.70 para 2 h; tarifa atual cadastrada implica R$ 25.00..
- Produção/perdas: Não há produção real importável: os 17 registros são `PLAN`, sem data de produção e sem `Qtd_Real`.; Não há registros de perdas reais. O modelo futuro deve exigir quantidade, unidade, motivo e vínculo com lote concluído..
- Os vínculos técnicos aprovados são auditáveis no manifesto; a prévia não usa aproximação de nomes.
- Os custos históricos de energia e mão de obra ficam como metadados; novos lotes concluídos usarão as tarifas operacionais atuais cadastradas.
- Cada perfil é único por par `versão da receita + produto final`; o mesmo produto poderá ter perfil novo quando a receita-base ganhar nova versão.
- As 12 linhas recheadas possuem vínculo técnico estrito com os seis insumos de recheio, mas a quantidade explícita não consta no workbook analisado; a pendência está preservada por SKU e referência de célula no manifesto, sem consumo inventado.

## O que poderá ser importado após aprovação

1. Ficha técnica-base, seus sete itens físicos e dois requisitos operacionais; custos históricos permanecem em metadados de auditoria.
2. Regras de embalagem individual já aprovadas para os 14 brownies mapeados, aplicáveis apenas em lote real concluído.
3. Os 12 vínculos de recheio estão mapeados, mas ainda não são importáveis como consumo por faltar a quantidade explícita na fonte.
4. Os 17 `PLAN` podem ser mantidos como planejamentos, sem produção, consumo, perda ou estoque.
5. Não há lote real, perda ou custo operacional histórico pronto para importar sem decisão adicional.

## Modelagem incremental preparada (ainda não aplicada)

1. `recipe_versions` e `recipe_items`: ficha técnica versionada, produto final, rendimento esperado, insumo físico, quantidade decimal, unidade, custo de referência e origem auditável.
2. `production_profile_components`: componentes adicionais de recheio por perfil, com `product_id`, quantidade decimal, unidade, base por unidade de saída, ID/hash/payload de origem. Os 12 recheios aprovados têm origem na decisão operacional `OPDEC-PROFILE-FILLINGS-2026-001`, não no workbook. A embalagem compatível já é requisito do perfil e será baixada no lote concluído futuro.
3. `production_batches` e `production_batch_outputs`: lote com data, receita/versionamento, quantidade planejada, quantidade produzida, status e confirmação. As saídas devem identificar produto principal ou `co_product`; `Bordinhas` é saída `co_product`, não perda.
4. `production_batch_consumptions` e `production_batch_losses`: em lote concluído, registrar o consumo efetivo de massa-base, recheio e embalagem com a regra de cálculo auditável, e registrar perdas separadamente. As respectivas movimentações de estoque devem ser criadas na mesma transação.
5. `operational_cost_rates`: tarifas versionadas por tipo, unidade e data de vigência, com ID/hash/payload da fonte. `operational_costs` referencia a tarifa efetivamente usada no lote, sem `product_id` ou movimento de estoque.
6. `production_profiles`: unicidade composta por `recipe_version_id + product_id`; o produto pode ter outro perfil em uma versão futura da receita-base.
7. IDs externos e hashes por receita, tarifa, item, componente, lote, saída, perda e custo impedem reimportação; o importador usa uma única transação e exige `--confirm`.

Nenhuma migration foi aplicada, nenhuma alteração foi feita no banco e nenhum dado foi importado.
