# MVP-01 — Fundação do Cacau v1

## Visão do Cacau v1

O Cacau é o painel operacional dos Seus Brownies. Ele reunirá o cardápio, compras, estoque, vendas, despesas e relatórios para que a operação artesanal tenha uma fonte única de informação. A base prioriza rastreabilidade: estoque é resultado de movimentações e valores históricos de vendas e compras não mudam quando um produto é alterado.

## Escopo desta entrega

- Painel inicial responsivo, em português do Brasil, com navegação para Visão geral, Produtos, Compras, Estoque, Vendas, Despesas e Relatórios.
- Dados visuais identificados como dados de exemplo, sem conexão com banco nem integrações externas.
- Remoção das telas demonstrativas padrão do TanStack Start.
- Schema Drizzle/PostgreSQL para categorias, produtos, movimentações de estoque, compras e itens, vendas e itens, despesas e processamento futuro de mensagens.
- Migration gerada, sem aplicação em banco.
- Arquivo `.env.example` sem qualquer segredo.

## Modelo de dados

Os valores financeiros usam `numeric(12,2)` do PostgreSQL para evitar imprecisão de ponto flutuante. Cada produto é classificado como ingrediente, embalagem ou produto final e informa sua unidade de medida (`g`, `kg`, `ml`, `l` ou unidade). Quantidades em compras, itens de venda e movimentações usam `numeric(14,3)`, suportando registros como `1,500 kg` e `0,250 kg` sem perda de precisão.

O produto não tem campo de saldo editável: o saldo é calculado exclusivamente a partir de `stock_movements.quantity_delta`, em que entradas são positivas e saídas são negativas. Compras têm uma referência opcional para uma futura foto ou arquivo de nota fiscal; nenhum upload é implementado nesta etapa.

As tabelas `sale_items` mantêm nome e preço como retrato do momento da venda. `message_processing_records` guarda identificador único do provedor, estado, tentativas e erro para permitir idempotência quando a integração com WhatsApp existir.

## Dependências fora desta entrega

| Dependência     | O que permanece pendente                                                                     |
| --------------- | -------------------------------------------------------------------------------------------- |
| Neon            | Criar a branch `development`, configurar a conexão local e aplicar a migration.              |
| Meta / WhatsApp | Criar app, webhook, validação de assinatura e fluxo de mensagens. Nenhuma chamada foi feita. |
| Cloudflare      | Configurar secrets, ambiente e deploy do Worker. Nenhum deploy foi feito.                    |

## Única informação necessária depois

Insira somente a string de conexão da branch **`development`** do Neon em `DATABASE_URL` no arquivo `.env.local`. Não versione esse arquivo.

Depois de configurá-la, os comandos sugeridos são:

```bash
npm run db:generate
npm run db:migrate
```

O primeiro apenas atualiza a migration a partir do schema. O segundo cria as tabelas na branch configurada; execute-o somente depois de revisar a migration.

## Próximos passos

1. Implementar relatórios detalhados usando os registros reais.
2. Integrar o webhook de WhatsApp com processamento idempotente.
3. Definir autenticação, permissões, upload de nota fiscal e estratégia de deploy antes de disponibilizar o painel.

## MVP-02 — Cadastro de categorias e produtos

As páginas `/categorias` e `/produtos` agora usam Server Functions do TanStack Start e Drizzle para listar, criar, editar e ativar/desativar registros. Não existe exclusão física: itens inativos permanecem disponíveis no histórico.

O acesso ao banco acontece exclusivamente nas funções de servidor. O navegador recebe dados das listas e envia apenas os campos dos formulários; `DATABASE_URL` não é exposta ao cliente.

Para suportar ingredientes e embalagens, `products.sale_price` passou a aceitar `NULL`. Produtos finais continuam exigindo preço de venda pela validação de formulário e do servidor. Essa alteração gera uma migration incremental, pois a migration inicial já foi aplicada no ambiente development.

## Fases operacionais seguintes

Compras e itens de compra agora são registrados com quantidades decimais e custos. A mesma transação cria as entradas em `stock_movements`. Vendas registram itens e totais calculados no servidor; somente os estados `confirmed` e `paid` criam saídas de estoque. Despesas são registradas separadamente.

A visão geral consulta o banco para mostrar produtos ativos, itens sem saldo ou com saldo negativo, compras recentes, vendas recentes, despesas do mês e quantidade de itens com saldo. Todas as listas possuem estados vazios para a operação recém-iniciada.

A migration que adiciona a unidade `m` já foi aplicada no ambiente de desenvolvimento do Neon, junto com o catálogo inicial. Esta etapa não cria nenhuma migration adicional.

## Prévia de importação do workbook

O comando `npm run import:preview -- <caminho-do-workbook>` lê somente as abas `02_Cadastro_Produtos` e `03_Cadastro_Insumos` e gera um relatório auditável em `docs/IMPORTACAO-WORKBOOK-PREVIA.md`. A prévia normaliza IDs, nomes, status e unidades, classifica insumos físicos como ingrediente ou embalagem por regra explícita e nunca grava no banco.

INS020 (energia/kWh) e INS021 (mão de obra/horas) são excluídos da futura importação de estoque. A unidade metro (`m`) é suportada pelo catálogo após a migration correspondente.

Após revisar a prévia e aplicar as migrations, `npm run import:catalog -- <caminho-do-workbook> --confirm` insere as categorias e os produtos físicos em uma única transação. Sem `--confirm`, ele só valida; com pendências, duplicidades ou SKU já existente, a operação é interrompida sem gravar nada.

## MVP-03 — Prévia do histórico do workbook

O catálogo inicial já foi carregado. A continuação segura é `npm run import:history:preview -- <caminho-do-workbook>`, que lê em modo somente leitura as abas de locais/canais, vendas, compras/despesas, estoque derivado e produção. O resultado é registrado em `docs/IMPORTACAO-HISTORICO-WORKBOOK-PREVIA.md`, incluindo hash do arquivo, contagens, validações, duplicidades, itens ignorados, normalizações e pendências.

A análise atual identificou 5 locais/canais, 15 eventos de venda com 182 itens, 23 compras candidatas a estoque, 7 despesas e 17 linhas que são somente planejamento de produção. A aba de estoque repete as 23 compras e não será tratada como uma segunda origem. Não foram localizadas linhas históricas de energia ou mão de obra.

As 23 compras de estoque têm alias/conversão aprovados no manifesto de revisão 2. As regras abrangem ovos, sacolas, bisnaga, recheios, óleo, laticínios, chocolates, maracujá e papel-manteiga; as conversões preservam a unidade alvo de estoque (`g`, `ml`, `m` ou `unit`). `SAI0020` usa a entrada direta aprovada de 845 g. As sacolas são embalagens em `unit`; a variante `12 × 8,5 × 16 cm` é um produto próprio. `SAI0007` e `SAI0017`, embora tenham a mesma descrição de origem, permanecem distintos por `source_id`. O catálogo-fonte já possui as quatro embalagens individuais de brownie; a regra futura é consumir uma unidade por brownie compatível, mas não haverá baixa das vendas históricas enquanto não existir saldo inicial ou produção real.

As decisões de negócio foram registradas: compras e despesas são de 2026; os cinco locais entram como `unclassified`; vendas históricas são financeiras e não afetam estoque; os 17 `PLAN` ficam fora da produção real; energia e mão de obra seguem fora do estoque. A prévia atualizada não contém pendências de alias nem campos inválidos; a importação continua exigindo `--confirm` e a migration aplicada manualmente.

### Modelagem proposta para revisão

- `sales_locations` e vínculo opcional em `sales` para locais/canais;
- lotes e saídas de produção com status, distinguindo planejamento de produção concluída;
- custos operacionais de energia e mão de obra fora de produtos e movimentações de estoque;
- aliases de importação de produtos com conversão decimal para vincular compra, item e movimentação de estoque corretamente; o manifesto versionado `data/importacao-compras-aliases.json` está na revisão 2, com 23 aliases aprovados. O alias é específico por `source_id`, pois descrições iguais podem representar produtos distintos;
- chaves externas e registros de importação com hash para impedir duplicidade e qualquer sobrescrita silenciosa.

A estrutura incremental de histórico adiciona locais/canais, aliases de compra, registros e hashes de importação, campos de auditoria/venda financeira, lotes de produção e custos operacionais. Conforme o estado informado da operação, o catálogo e o histórico já foram carregados no Neon; não execute novamente `npm run db:migrate` ou o importador histórico sobre essa base. O importador transacional preserva a proteção contra duplicidade: qualquer chave externa, hash, alias ou incompatibilidade de catálogo existente interrompe toda a operação.

## MVP-04 — Prévia de produção, fichas técnicas e custos

O comando `npm run production:preview -- <caminho-do-workbook>` gera `docs/IMPORTACAO-PRODUCAO-WORKBOOK-PREVIA.md` em modo somente leitura. Ele analisa a ficha técnica-base da aba `03_Cadastro_Insumos`, os 17 cartões de produto e os 17 planejamentos `PLAN` da aba `09_Producao_Fornadas`, além dos custos operacionais e parâmetros de gestão. Nenhuma migration, conexão com banco ou importação é realizada.

A fonte tem uma receita-base com sete componentes físicos, energia e mão de obra, mas não fichas completas para cada produto final. Os sete vínculos técnicos aprovados — incluindo Ovos Grandes, as duas linhas de Óleo, Chocolate e Papel Manteiga —, tarifas vigentes e componentes de perfil estão no manifesto `data/receita-base-vinculos.json`, revisão 4. As regras aprovadas de embalagem consomem uma `unit` para cada um dos 14 brownies compatíveis, exclusivamente em lotes reais concluídos.

Não há produção real ou perda registradas: os 17 `PLAN` são planejamentos sem data real, quantidade real ou confirmação e continuam sem movimentações. Energia e mão de obra são custos operacionais fora do estoque. Os valores da ficha (R$ 0,04 por 1 kWh e R$ 1,70 para duas horas) permanecem como referência histórica auditável, enquanto as tarifas vigentes aprovadas do workbook são R$ 0,85/kWh e R$ 12,50/h.

Conforme o estado informado da operação, a importação inicial de produção e a sincronização dos 12 componentes já estão no banco. A migration `0007_unique_post.sql` criou `production_profile_components`, que vincula perfil, insumo físico, papel `filling`, quantidade decimal por unidade final, unidade, ID/hash únicos e payload auditável. A tabela impede duplicidade do mesmo recheio no mesmo perfil.

O comando `npm run production:import -- <workbook> --confirm` insere em uma única transação a receita-base, seus sete itens, os dois requisitos operacionais, duas tarifas vigentes, 17 perfis e 17 `PLAN`, com IDs externos e hashes. A importação falha por completo em qualquer duplicidade ou incompatibilidade e não cria estoque, consumo, perda nem custo realizado para os planejamentos. Lotes futuros concluídos devem selecionar a tarifa vigente mais recente de cada tipo na data do lote e registrar essa tarifa no custo operacional; nunca devem usar `recipe_operational_requirements.historicalCost` como custo atual.

Os 12 produtos recheados têm vínculos técnicos estritos com Brigadeiro, Doce de Leite, Leite Ninho, Creme de Avelã, Goiabada ou Maracujá. As quantidades aprovadas são 20 g por brownie 5×5 (`PROD003` a `PROD008`) e 40 g por brownie 7×7 (`PROD009` a `PROD014`). A origem auditável é a decisão operacional `OPDEC-PROFILE-FILLINGS-2026-001` aprovada pela usuária; ela não é apresentada como dado extraído do workbook, que apenas referencia os tipos em `02_Cadastro_Produtos!E7:E18`. O comando `npm run production:profiles:sync -- <workbook> --confirm` valida os 12 vínculos sem `--confirm` e, com confirmação, insere somente componentes inexistentes em uma única transação; qualquer divergência de ID, hash, perfil, produto, quantidade ou unidade interrompe tudo sem alteração parcial.

Os componentes de recheio não geram consumo ou estoque agora. Em lote futuro concluído, a regra será baixar a massa-base pela receita versionada, o recheio pelo componente de perfil multiplicado pela quantidade efetivamente produzida e a embalagem compatível, gerando movimentações na mesma transação. Bordinhas é uma saída planejada própria (`PROD002`/`PLAN002`), a ser modelada como coproduto — nunca perda — quando houver lotes reais.

A vigência inicial `2026-01-01` das duas tarifas foi registrada explicitamente no manifesto, coerente com o período do workbook; uma alteração posterior deverá criar nova tarifa, sem sobrescrever a atual.

## MVP-05 — Produção real operacional

A tela `/producao` implementa lotes reais separados dos 17 registros históricos `PLAN`. O operador seleciona a receita-base ativa, informa data, multiplicador e várias saídas de produtos finais. A ocupação de massa é calculada por `quantidade / rendimento do perfil`; a soma não pode superar o multiplicador do lote.

O saldo de capacidade é sugerido como `Bordinhas` (`PROD002`), que é coproduto e não perda. Bordinhas não consome embalagem individual. Uma quantidade manual abaixo do saldo somente é aceita quando a diferença é registrada como perda manual de Bordinhas com motivo; não existe perda automática. Perdas são gravadas somente na conclusão e possuem motivo obrigatório no banco.

Salvar um lote cria somente um rascunho. A conclusão usa uma transação única e bloqueia os produtos físicos envolvidos antes de reavaliar o saldo: registra consumos de receita-base, recheios e embalagens; entradas dos produtos finais e Bordinhas; custos de energia e mão de obra; e o status concluído. Falha de saldo, rendimento, tarifa ou duplicidade reverte a operação inteira. O status `draft` e o bloqueio de linha impedem concluir o mesmo lote duas vezes.

Os insumos físicos usam custo médio ponderado perpétuo reconstituído a partir de `stock_movements`; o custo unitário e total efetivamente usados ficam nos consumos. Energia e mão de obra continuam fora do estoque: cada custo grava a quantidade, unidade, ID da tarifa vigente, valor unitário e valor total aplicados. Nenhuma venda histórica é recalculada ou recebe movimentação retroativa.

As migrations incrementais pendentes são:

- `0008_high_rumiko_fujikawa.sql`: status de rascunho, papéis de saída, multiplicador, totais, custo unitário e instantâneo de tarifas;
- `0009_lethal_pyro.sql`: motivo obrigatório para perda de lote.

Revise e aplique-as manualmente apenas quando autorizado:

```bash
npm run db:migrate
```

Depois, crie e conclua lotes pela tela **Produção**. Não há comando de importação ou conclusão automática nesta fase.
