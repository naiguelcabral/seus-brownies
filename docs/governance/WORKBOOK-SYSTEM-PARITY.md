# Matriz de paridade — workbook original × Cacau v1

Atualizada em 10 de setembro de 2026. Esta matriz é a fonte canônica de
paridade funcional entre o workbook original e o sistema. Ela descreve
estrutura e totais sanitizados; não reproduz linhas históricas, nomes pessoais
ou observações livres.

## Evidência e método

- Fonte inspecionada somente em leitura:
  `.codex-local/reference/Workbook_Gerenciamento_Seus_Brownies.xlsx`.
- SHA-256 observado:
  `25aa62df5fc9b2e01402e9c242142322d9c6f54a345e800cb947b77865ce5b64`.
- Estrutura: 15 abas visíveis, 12 tabelas do Excel, 3 gráficos, 1 validação de
  lista, 4 comentários de proveniência e nenhuma faixa nomeada.
- Fórmulas: as 15 planilhas têm zero células `<f>` e o pacote não contém
  `calcChain.xml`. `calcPr` pede recálculo completo, mas todos os números são
  valores armazenados. Portanto, o arquivo não contém fórmulas executáveis a
  recuperar; as regras abaixo foram reconstruídas de títulos, campos,
  instruções, resultados reconciliados e documentação canônica.
- Evidência histórica sanitizada: 17 produtos, 21 insumos/recursos, 11 itens de
  receita-base, 5 locais/canais, 15 eventos e 182 linhas de venda, 30 saídas,
  23 linhas de estoque, 17 linhas de planejamento de produção e 6 ações.
- Controle histórico do workbook: faturamento informado de R$ 12.479,00,
  calculado de R$ 12.914,00 e diferença de -R$ 435,00. Os detalhes somam 1.198
  unidades. Esses valores são evidência do modelo, não números estáticos a
  publicar na aplicação.
- Divergências internas do workbook: o mix cadastrado soma 103%, apesar de uma
  projeção válida exigir 100%; custos e alocações usam casas além de centavos;
  as 23 linhas de estoque não têm data, validade ou lote preenchidos; a
  produção contém previsão, mas quantidade real e perda zeradas.

## Estados permitidos

`implementado-e-validado`, `implementado-nao-homologado`, `parcial`, `ausente`,
`aguardando-decisao`, `aguardando-recurso-externo`, `nao-aplicavel` e
`divergente`.

Um campo no schema, isoladamente, não satisfaz paridade. O status considera
persistência, regra no servidor, autorização, tela/consulta, rastreabilidade e
teste.

## Mapa das abas

| Aba                             | Função original                                                           | Banco / domínio atual                                                             | Serviço / rota / relatório                         | Teste principal                              | Status                        | Divergência ou decisão                                                                                               | Critério de aceite                                                              |
| ------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `00_Instrucoes`                 | Governança de uso diário, semanal e mensal                                | Regras distribuídas em governança e domínios                                      | Documentação canônica                              | revisão documental                           | `parcial`                     | O workbook é estático; o sistema ainda não oferece checklist operacional                                             | Regras sem conflito, com links para a operação e sem números fixos na UI        |
| `01_Parametros`                 | Premissas financeiras e operacionais editáveis                            | `management_settings` com versão otimista                                         | funções de gestão; `/parametros`                   | paridade e autorização                       | `implementado-nao-homologado` | Migration `0019` preparada e não aplicada                                                                            | Aplicar em ambiente autorizado e homologar edição, concorrência e auditoria     |
| `02_Cadastro_Produtos`          | Catálogo, preço, custo, rendimento e margem                               | `categories`, `products`, `production_profiles` e custos de produção/FIFO         | funções de catálogo; `/produtos`; relatórios FIFO  | catálogo, estrutura, produção e relatórios   | `parcial`                     | Preço/atividade existem; custo e margem definitiva dependem de G2; tamanho/recheio estão no perfil                   | Cadastro e consulta rastreáveis; custo/margem somente quando sustentados        |
| `03_Cadastro_Insumos`           | Insumos, embalagem, unidade, custo, fornecedor, reposição e receita-base  | `products`, compras, aliases, receitas e custos operacionais                      | catálogo, compras, estoque e produção              | paridade/produção/estrutura                  | `parcial`                     | Ponto de reposição e fornecedor padrão/real estão locais; custo derivado segue parcial                               | Aplicar `0021`/`0022`; preservar unidade e derivar custo de fatos               |
| `04_Cadastro_Locais`            | Local/canal, tipo, frequência, status e observação                        | `sales_locations`                                                                 | funções de locais; `/locais`; venda e relatório    | paridade e autorização                       | `implementado-nao-homologado` | UI local ainda não homologada                                                                                        | CRUD protegido, validação, inativação, paginação e uso na venda                 |
| `05_Base_Vendas`                | Evento de venda e detalhe por produto                                     | `sales`, `sale_items`, `stock_movements`, alocações FIFO                          | funções de vendas; `/vendas`; relatórios           | escrita, idempotência, histórico e paridade  | `implementado-nao-homologado` | Novos campos dependem da migration `0019`                                                                            | Homologar valores separados, local, motivo, autoria, estoque e replay           |
| `06_Auditoria_Receita`          | Diferença caixa × tabela, percentual e severidade                         | `sales` e rateio exato em `sale_items.reported_amount`                            | venda, histórico, relatório e CSV                  | limites, rateio e métricas                   | `implementado-nao-homologado` | Histórico anterior à migration terá cobertura parcial                                                                | Aplicar migration e homologar limites, sinais, filtros e exportação             |
| `07_Base_Compras_Despesas`      | Compras e saídas classificadas por efeito em estoque/lucro                | `purchases`, `purchase_items`, `expenses`, `stock_movements`, custos operacionais | `/compras`, `/despesas`, relatórios                | escrita, idempotência, históricos            | `parcial`                     | Workbook mistura compra de estoque e despesa; sistema separa corretamente, mas competência financeira segue pendente | Compra alimenta estoque; consumo alimenta CMV; despesas não alteram estoque     |
| `08_Estoque_Insumos`            | Entradas, saídas, saldo, custo, validade, lote, fornecedor e reposição    | razão, FIFO, compras com lote/validade e ponto por produto                        | `/compras`, `/estoque`, reconciliação e relatórios | FIFO, lifecycle, reconciliação e paridade    | `parcial`                     | Estrutura local depende de `0021`; cobertura ainda exige consumo confiável                                           | Homologar rastreabilidade e alerta; saldo segue derivado e não editável         |
| `09_Producao_Fornadas`          | Planejamento, previsto/real, perdas, custo, status e observação           | `production_batches`, perfis, saídas, consumos, perdas e custos                   | funções e `/producao`; relatórios                  | cálculos, identidades, conclusão e histórico | `implementado-nao-homologado` | Consulta por receita/status/produto/período está local; custo realizado depende de lotes concluídos                  | Homologar filtros e manter conclusão transacional, custo e estoque rastreáveis  |
| `10_Metas_e_Cenarios`           | Meta de lucro, custos fixos, faturamento-alvo e mix                       | `management_settings`; sem mix/cenário                                            | `/parametros`; sem rota de cenário                 | paridade de parâmetros                       | `parcial`                     | Mix do workbook soma 103%; margem/competência aguardam decisão                                                       | Mix auditável soma 100%; projeção exata após G2                                 |
| `11_Plano_de_Acao`              | Alertas convertidos em ação, prioridade, KPI, responsável, prazo e status | `action_plans`, histórico append-only e auditoria operacional                     | funções; `/plano-de-acao`                          | `action-plan` e autorização                  | `implementado-nao-homologado` | Migration `0020` preparada; Dono/Admin na primeira versão                                                            | Aplicar migration e homologar CRUD, concorrência, filtros e histórico           |
| `12_Dashboard_Atual_V2`         | Receita, volume, margem, meta, auditoria, produto e local                 | Agregados de vendas, despesas, estoque, produção e FIFO                           | `/relatorios` e `/`                                | cálculos/consultas/CSV/paridade              | `parcial`                     | Volume, ticket, auditoria e local estão locais; meta/lucro/margem dependem de G2                                     | Cada KPI declara período/unidade/fonte, trata ausência e permite rastrear fatos |
| `13_Dashboard_Meta_10k`         | Meta, custos fixos, margem necessária, volume e mix                       | parâmetros persistidos; sem mix/cenário                                           | `/parametros`; sem dashboard de meta               | parâmetros                                   | `parcial`                     | Resultados do workbook são estáticos e o mix soma 103%                                                               | Recalcular de premissas válidas sem copiar números do workbook                  |
| `14_Dashboard_Gerencial_Futuro` | Mapa de análises futuras                                                  | Domínios parciais em relatórios, FIFO e produção                                  | `/relatorios`                                      | relatórios e reconciliação                   | `parcial`                     | Cobertura/sugestão/otimização não têm base ou regra aprovada                                                         | Entregar apenas métricas rastreáveis; recomendações exigem regra aprovada       |

## Campos por domínio

### Parâmetros gerenciais (`01_Parametros`)

| Campo do workbook                        | Significado/regra                                    | Banco / serviço / tela                         | Status                        | Divergência                                                     | Critério de aceite                                      |
| ---------------------------------------- | ---------------------------------------------------- | ---------------------------------------------- | ----------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| `Meta_Lucro_Liquido_Mensal`              | objetivo mensal em centavos exatos                   | `monthly_profit_goal`; funções; `/parametros`  | `implementado-nao-homologado` | não confundir com faturamento-alvo                              | Dono/Admin edita; valor positivo, versionado e auditado |
| `Custos_Fixos_Mensais`                   | custos fixos usados depois da margem de contribuição | `fixed_monthly_costs`; funções; `/parametros`  | `parcial`                     | valor editável; competência e dupla contagem aguardam decisão   | aplicar somente após decisão financeira                 |
| `Dias_Venda_Mes`                         | divisor operacional da meta diária                   | `sales_days_per_month`; funções; `/parametros` | `implementado-nao-homologado` | —                                                               | inteiro entre 1 e 31                                    |
| `Semanas_Mes`                            | divisor operacional da meta semanal                  | `weeks_per_month`; funções; `/parametros`      | `implementado-nao-homologado` | workbook usa 4, apesar de meses não terem sempre quatro semanas | decimal entre 1 e 6                                     |
| `Tolerancia_Divergencia_Receita`         | até 3% é normal no modelo                            | `normal_revenue_tolerance`; writer de venda    | `implementado-nao-homologado` | limiar editável, não constante no cálculo                       | percentual exato, menor que o crítico                   |
| `Tolerancia_Divergencia_Receita_Critica` | acima de 8% é crítico no modelo                      | `critical_revenue_tolerance`; writer de venda  | `implementado-nao-homologado` | faixa intermediária usa `attention`                             | percentual exato, maior que o normal                    |
| `Margem_Minima_Produto`                  | limiar de revisão de produto                         | `minimum_product_margin`; `/parametros`        | `parcial`                     | cadastrado; margem realizada depende de G2                      | aplicar somente à margem sustentada                     |
| `Reserva_Taxas_Impostos_%`               | reserva opcional sobre faturamento                   | `fee_tax_reserve_rate`; `/parametros`          | `parcial`                     | cadastrado sem aplicação; competência pendente                  | aplicar somente após aprovação financeira               |

### Produtos e insumos (`02_Cadastro_Produtos`, `03_Cadastro_Insumos`)

| Campos do workbook                                        | Banco correspondente                                          | Serviço / rota                       | Teste                | Status                        | Divergência / aceite                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------ | -------------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| IDs, produto/insumo, categoria, ativo                     | `products.id/name/category_id/is_active`, `categories`        | catálogo; `/produtos`, `/categorias` | catálogo/estrutura   | `implementado-e-validado`     | IDs externos ficam em `source_id`/aliases nas importações                                  |
| tamanho, recheio, rendimento                              | `production_profiles.cut_size/filling/expected_yield`         | workspace de produção                | produção             | `implementado-nao-homologado` | Não alterar perfis usados sem regra versionada                                             |
| preço sugerido                                            | sem fato canônico                                             | nenhum                               | nenhum               | `aguardando-decisao`          | fórmula comercial não aprovada                                                             |
| preço praticado                                           | `products.sale_price`; snapshot em `sale_items.unit_price`    | catálogo e venda                     | escrita de venda     | `implementado-e-validado`     | Histórico usa snapshot, não preço atual                                                    |
| custos unitários/total e lucro/margem                     | consumos, custos operacionais, camadas/alocações FIFO         | produção e relatórios                | produção/FIFO        | `parcial`                     | Workbook guarda resultado estático com precisão irregular; margem definitiva depende de G2 |
| unidade e quantidade de embalagem                         | `products.unit`, aliases/conversões e itens de compra         | catálogo/compras                     | precisão e estrutura | `parcial`                     | Conversões existem para importação, não como cadastro geral na UI                          |
| fornecedor padrão e ponto de reposição                    | `products.preferred_supplier_name/reorder_point`; compra real | catálogo, compra e `/estoque`        | paridade de estoque  | `implementado-nao-homologado` | fornecedor padrão é informativo; a compra preserva o fornecedor efetivo                    |
| receita-base: item, consumo, unidade e custo proporcional | `recipe_versions`, `recipe_items`, requisitos operacionais    | produção                             | importação/produção  | `implementado-nao-homologado` | Energia/MO permanecem fora do estoque                                                      |

### Locais e canais (`04_Cadastro_Locais`)

| Campo                                                | Banco                               | Serviço / tela / relatório            | Teste                | Status                        | Critério de aceite                                |
| ---------------------------------------------------- | ----------------------------------- | ------------------------------------- | -------------------- | ----------------------------- | ------------------------------------------------- |
| ID, local/canal                                      | `sales_locations.id/source_id/name` | funções; `/locais`; venda e relatório | paridade/autorização | `implementado-nao-homologado` | nome único, histórico preservado                  |
| tipo                                                 | `classification`                    | funções; `/locais`                    | validação/paridade   | `implementado-nao-homologado` | enum validado no servidor                         |
| frequência                                           | `frequency`                         | funções; `/locais`                    | paridade             | `implementado-nao-homologado` | texto limitado; não gerar recomendação automática |
| status                                               | `is_active`                         | ativação/inativação; `/locais`        | paridade             | `implementado-nao-homologado` | inativar, não apagar histórico                    |
| observação                                           | `notes`                             | funções; `/locais`                    | paridade             | `implementado-nao-homologado` | tamanho limitado e autorização                    |
| faturamento, eventos, unidades, ticket e divergência | dados de vendas/local               | `/relatorios` e CSV                   | métricas/CSV         | `implementado-nao-homologado` | inteiros exatos, cobertura de auditoria e período |
| margem por local                                     | alocações FIFO + local da venda     | não exposta                           | FIFO                 | `aguardando-decisao`          | depende de G2 e corte temporal                    |

### Vendas e auditoria (`05_Base_Vendas`, `06_Auditoria_Receita`)

| Campo                                           | Banco                                       | Serviço / rota / relatório | Teste                     | Status                        | Divergência / aceite                                         |
| ----------------------------------------------- | ------------------------------------------- | -------------------------- | ------------------------- | ----------------------------- | ------------------------------------------------------------ |
| evento, data/mês, local                         | `sales.id/sold_at/location_id`              | criação e histórico        | paginação/paridade        | `implementado-nao-homologado` | mês derivado da data                                         |
| faturamento informado                           | `sales.reported_amount`                     | writer e `/vendas`         | paridade                  | `implementado-nao-homologado` | separado do calculado                                        |
| faturamento calculado                           | `sales.calculated_amount`; itens/snapshots  | writer e `/vendas`         | cálculos/paridade         | `implementado-nao-homologado` | preço cadastrado no instante da venda                        |
| diferença R$                                    | informado − calculado                       | venda, relatório e CSV     | limites/métricas          | `implementado-nao-homologado` | centavos exatos e sinal preservado                           |
| diferença %                                     | diferença ÷ calculado                       | relatório e CSV            | métricas                  | `implementado-nao-homologado` | zero calculado fica indisponível                             |
| status normal/atenção/crítico                   | `sales.audit_status`                        | writer e histórico         | limites exatos            | `implementado-nao-homologado` | tolerâncias configuráveis                                    |
| motivo/observação/ação recomendada              | `adjustment_kind/reason`, auditoria/notas   | writer e `/vendas`         | contrato/paridade         | `implementado-nao-homologado` | motivo humano; nenhuma ação automática                       |
| produto, quantidade, preço cadastrado           | `sale_items`                                | venda e relatório          | venda/FIFO                | `implementado-e-validado`     | snapshot histórico obrigatório                               |
| preço real e faturamento informado alocado      | `sale_items.reported_amount`                | writer e relatório/produto | rateio exato              | `implementado-nao-homologado` | rateio fecha exatamente em centavos                          |
| custo, margem R$ e %                            | FIFO por alocação                           | relatório FIFO             | relatório                 | `aguardando-decisao`          | não chamar definitivo antes de G2                            |
| desconto, combo, brinde ou ajuste               | `discount_amount`, `adjustment_kind/reason` | criação e histórico        | contrato/paridade         | `implementado-nao-homologado` | tipo e motivo obrigatórios quando valores divergem           |
| consulta por período, local e produto           | filtros no servidor                         | `/vendas`                  | histórico                 | `implementado-nao-homologado` | homologar UI e índices com volume real                       |
| ticket médio por evento                         | receita elegível ÷ eventos                  | `/relatorios` e CSV        | métricas                  | `implementado-nao-homologado` | arredondamento exato em centavos                             |
| autoria, auditoria, idempotência e concorrência | autoria/chave/hash/audit/FIFO locks         | writer de venda            | escrita/idempotência/FIFO | `implementado-e-validado`     | Novos campos devem integrar o mesmo hash e a mesma transação |
| CSV seguro                                      | agregados autorizados                       | `/relatorios`              | CSV                       | `implementado-e-validado`     | Abrir em planilha ainda não homologado externamente          |

### Compras, despesas, estoque e produção (`07` a `09`)

| Campos/fluxo                                                | Banco / serviço / tela                                         | Teste                             | Status                        | Divergência / aceite                                            |
| ----------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------- | ----------------------------- | --------------------------------------------------------------- |
| compra: data, fornecedor, itens, quantidade, custo e total  | compras/itens; `/compras`                                      | precisão, idempotência, histórico | `implementado-e-validado`     | Forma de pagamento/subcategoria não são fatos estruturados      |
| tipo gerencial, afeta lucro, afeta estoque                  | separação entre compras, despesas, movimentos e CMV            | operações/relatórios              | integração de escrita         | `divergente`                                                    | Sistema não adota flags livres; usa tipo de fato para preservar integridade |
| entrada/saída/saldo/unidade/custo                           | razão `stock_movements` e camadas FIFO                         | `/estoque`, relatório             | estoque/FIFO/reconciliação    | `implementado-e-validado`                                       | Saldo derivado; filtros e paginação locais preservam a razão                |
| validade, lote de fornecedor, fornecedor no movimento       | `purchase_items.expires_on/supplier_lot`; referência da compra | `/compras` e `/estoque`           | `implementado-nao-homologado` | Estrutura depende de `0021`; lote de produção segue distinto    |
| ponto/status de reposição                                   | `products.reorder_point`; saldo derivado                       | catálogo, `/estoque` e dashboard  | `implementado-nao-homologado` | Comparação exata na unidade; filtro e alerta não sugerem compra |
| cobertura em dias/sugestão de compra                        | sem consumo histórico confiável por janela                     | nenhum                            | `aguardando-recurso-externo`  | Requer histórico suficiente e regra aprovada                    |
| produção: produto, fornadas, previsto/real, perdas/%        | lotes, perfis, saídas e perdas                                 | `/producao`                       | cálculos/conclusão            | `implementado-nao-homologado`                                   | Percentual pode ser derivado; perdas exigem motivo                          |
| custo estimado/realizado                                    | prévia + consumos/custos/snapshots                             | produção e relatório              | alocação exata                | `implementado-nao-homologado`                                   | Somente lotes concluídos sustentam realizado                                |
| status, observação, ficha técnica, estoque/lotes, histórico | tabelas versionadas e transação de conclusão                   | `/producao` e relatório           | lifecycle/histórico           | `implementado-nao-homologado`                                   | Busca, filtros e paginação locais excluem registros PLAN                    |

### Metas, dashboards e plano de ação (`10` a `14`)

| Campo/indicador                                                  | Fonte prevista no sistema                  | Status                        | Divergência / decisão                            | Critério de aceite                                          |
| ---------------------------------------------------------------- | ------------------------------------------ | ----------------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| meta mensal, custos fixos, margem necessária                     | parâmetros + margem aprovada               | `parcial`                     | parâmetros existem; margem/competência pendentes | aplicar migration; cálculo após decisão G2                  |
| faturamento-alvo                                                 | mix × preço × margem por produto           | `aguardando-decisao`          | depende da definição de margem/custo             | fórmula documentada e rastreável                            |
| progresso/diferença para meta                                    | resultado gerencial comparado à meta       | `aguardando-decisao`          | não usar receita como substituto de lucro        | declarar fonte e período                                    |
| unidades mensais/semanais, ticket alvo                           | cenário/mix/parâmetros                     | `ausente`                     | semanas podem ser fracionárias                   | arredondamento explícito e teste de limites                 |
| mix e validação de soma                                          | sem tabela                                 | `ausente`                     | workbook soma 103%                               | bloquear cenário ativo que não some exatamente 100%         |
| faturamento e margem projetados por produto                      | mix + preço/custo aprovados                | `aguardando-decisao`          | G2                                               | rastrear até versão do mix e premissas                      |
| faturamento total e unidades                                     | vendas elegíveis/itens                     | `implementado-nao-homologado` | sem comparação temporal                          | período e status explícitos                                 |
| margem/contribuição, margem %, lucro gerencial                   | FIFO + custos fixos + política de reversão | `aguardando-decisao`          | G2 e competência                                 | não rotular como definitivo antes da aprovação              |
| preço médio e ticket médio                                       | vendas/itens                               | `implementado-nao-homologado` | —                                                | cálculos exatos e ausência de dados explícita               |
| divergência de receita                                           | informado/calculado                        | `implementado-nao-homologado` | cobertura histórica parcial                      | mostrar valor, percentual, severidade e cobertura           |
| produto por faturamento/margem e abaixo do mínimo                | itens + FIFO + parâmetro                   | `parcial`                     | faturamento existe; margem final pendente        | rastrear ao produto e fatos do período                      |
| locais/canais                                                    | vendas + `sales_locations`                 | `implementado-nao-homologado` | falta comparação temporal                        | agregação limitada, rastreável e testada                    |
| estoque baixo                                                    | saldo derivado + ponto de reposição        | `implementado-nao-homologado` | ponto nulo usa zero como fallback                | comparação decimal exata e rastreio até o saldo             |
| alerta, causa, ação, prioridade, KPI, responsável, prazo, status | `action_plans`, histórico e auditoria      | `implementado-nao-homologado` | causa e ação são informadas por humano           | aplicar `0020`; homologar autoria, histórico e concorrência |

## Regras financeiras reconstruídas

### Receita informada, calculada e divergência

- `faturamento informado`: valor efetivamente informado para o evento.
- `faturamento calculado`: soma de quantidade × preço cadastrado no instante
  da venda.
- `diferença em reais = informado − calculado`.
- `diferença percentual = diferença / calculado`, indisponível quando o
  calculado é zero.
- Regra original: módulo da diferença até 3% é normal; acima de 8% é crítico.
  A faixa intermediária será rotulada `atenção`. Os dois limites devem ser
  parâmetros do servidor, com `normal < crítico`.
- Exemplo: calculado R$ 100,00 e informado R$ 94,00 produz -R$ 6,00 e -6%:
  `atenção` com os limites originais. O sinal explica a direção; a severidade
  usa o módulo.

### Preço real, descontos, combos e brindes

O workbook distribui o faturamento informado entre linhas e calcula um preço
real médio, mas não guarda fórmulas. O writer local preserva o valor informado
total em centavos e, quando há vários itens, aloca-o por uma regra determinística
de maior resto que fecha exatamente. Toda divergência intencional exige
tipo (`desconto`, `combo`, `brinde` ou `ajuste`) e motivo humano. O sistema não
deve inferir acusação ou fraude.

### Custo unitário, margem e lucro gerencial

- O custo unitário histórico do workbook é um resultado armazenado com casas
  além da precisão monetária. No sistema, quantidade usa milésimos, custo
  unitário usa milésimos monetários e valores fecham em centavos.
- `margem de contribuição = receita elegível − CMV realizado` somente depois
  de aprovada a regra G2 para corte temporal, reversões e vínculo.
- `lucro gerencial estimado = margem de contribuição − custos fixos − reserva
aprovada para taxas/impostos`, sem descontar novamente compras já
  reconhecidas no consumo.
- Margem mínima e reserva podem ser cadastradas, mas sua aplicação financeira
  permanece `aguardando-decisao`.

### Compras de estoque versus consumo efetivo

O workbook declara que compra destinada ao estoque não deve ser subtraída
integralmente do lucro enquanto não consumida. Isso converge com a arquitetura:
compra cria estoque/camada; venda e produção consomem fatos; FIFO fornece CMV
realizado. A coluna livre `Afeta_Lucro_Mes` do workbook diverge do modelo do
sistema e não deve ser copiada como atalho.

Exemplo: compra de R$ 600,00 para 100 unidades, venda de 20 unidades por
R$ 200,00 e nenhum outro custo. Subtrair a compra inteira produz -R$ 400,00.
Reconhecer consumo de R$ 120,00 produz margem de R$ 80,00 e mantém R$ 480,00
no estoque. Esta é a recomendação técnica de integridade; o fechamento
contábil oficial ainda exige decisão humana.

### Decisões financeiras que permanecem humanas

| Tema                    | Alternativas curtas                                                       | Recomendação técnica                                                         | Impacto                                         |
| ----------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| competência             | caixa; posição no corte; fatos por competência                            | posição no corte para fechamento e fatos explícitos para eventos posteriores | define períodos de receita, custo e lucro       |
| reversão temporal       | reabrir período original; reconhecer no evento; visão operacional mutável | preservar período fechado e registrar evento posterior                       | muda comparabilidade histórica                  |
| créditos                | reduzir venda original; criar fato financeiro próprio                     | fato próprio auditável                                                       | exige migration e política de descontos/entrega |
| vínculo venda–lote      | exigir lote; manter camada obrigatória e lote opcional                    | camada obrigatória; lote apenas quando a origem for produção                 | evita lotes fictícios de compra/ajuste          |
| cancelamento retroativo | reescrever; evento compensatório                                          | evento compensatório idempotente                                             | preserva trilha de auditoria                    |

O exemplo completo de R$ 100,00/R$ 60,00 com devolução posterior está em
`G2-CMV-DECISION.md` e não é redefinido aqui.

## Relações e fluxo funcional

```text
Parâmetros + produtos/perfis + locais
                 ↓
            venda/evento
        ↙                     ↘
receita informada        itens a preço cadastrado
        ↘                     ↙
      auditoria exata de divergência
                 ↓
relatórios por período, produto e local

compras → movimentos/camadas → estoque/FIFO ← produção concluída
                                   ↓
                           CMV e margem (gate G2)
                                   ↓
                         metas e plano de ação
```

## Backlog de paridade priorizado

1. `WP-A`: concluído localmente; parâmetros gerenciais persistidos, validados,
   protegidos, versionados e auditados; aguarda migration/homologação.
2. `WP-B`: concluído localmente; captura e auditoria de receita na venda, com
   local e motivo de ajuste, preservando idempotência/concorrência; aguarda
   migration/homologação.
3. `WP-C`: concluído localmente; CRUD de locais/canais e métricas rastreáveis;
   aguarda homologação.
4. `WP-G`: concluído localmente para volume, ticket, preço médio, divergência e
   indicadores por local; comparação temporal e margens seguem separadas.
5. `WP-D`: metas e mix, interrompendo somente cálculos dependentes de G2.
6. `WP-E/F`: ponto de reposição e lote/validade/fornecedor concluídos
   localmente via `0021`; histórico de produção real ampliado no WP-E1;
   cobertura de estoque continua pendente.
7. `WP-H`: concluído localmente com confirmação humana de causa/ação,
   concorrência otimista e histórico append-only; aguarda migration/homologação.

## Gates e recursos externos

- `aguardando-decisao`: competência financeira, reversões, créditos,
  cancelamentos retroativos, margem definitiva e vínculo venda–lote.
- `aguardando-recurso-externo`: homologação HML/navegador; dados suficientes
  para cobertura de estoque; aplicação das migrations em banco autorizado.
- As migrations aditivas `0019`, `0020`, `0021` e `0022` foram preparadas e não aplicadas.
  `0019` centraliza parâmetros e campos de receita; `0020` cria plano de ação e
  histórico; `0021` adiciona ponto de reposição, lote e validade; `0022`
  adiciona fornecedor padrão informativo. O rollback exige reverter o código
  antes de remover objetos e é destrutivo para dados novos, portanto permanece
  exclusivamente humano.
- Nenhuma migration desta missão pode ser aplicada em HML ou produção.
- Nenhum total histórico do workbook deve virar constante no dashboard.
