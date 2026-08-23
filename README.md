# Seus Brownies — Cacau v1

Painel operacional inicial para organizar produtos, compras, estoque, vendas, despesas e relatórios dos Seus Brownies.

Consulte o [status consolidado do projeto](docs/STATUS-PROJETO.md) para saber o
que já foi entregue, o que está pendente e quais documentos preservam o
histórico auditável.

## Executar localmente

Com Node.js e npm instalados, inicie o projeto pelo terminal na pasta deste repositório:

```bash
npm run ligar
```

O comando instala as dependências quando necessário, tenta buscar atualizações quando não há trabalho local pendente e abre o painel em `http://localhost:3000`.

## Salvar o trabalho

Ao encerrar, use:

```bash
npm run desligar
```

O comando registra as alterações no Git e sincroniza a branch quando houver conexão. Revise a mensagem do terminal caso exista algum conflito ou falha de conexão.

## Banco de dados

O painel possui operações reais em `/categorias`, `/produtos`, `/compras`, `/estoque`, `/vendas` e `/despesas`. O acesso ao PostgreSQL acontece somente em Server Functions; a `DATABASE_URL` não é enviada ao navegador. Ingredientes e embalagens podem não ter preço de venda, enquanto produtos finais exigem esse preço.

Compras criam entradas de estoque e vendas confirmadas ou pagas criam saídas. A visão geral mostra indicadores calculados do banco e apresenta estados vazios quando ainda não existem registros.

## Prévia segura do workbook

Para analisar um workbook antes de qualquer importação, execute:

```bash
npm run import:preview -- "/caminho/para/Workbook_Gerenciamento_Seus_Brownies.xlsx"
```

O comando apenas lê as abas de cadastro de produtos e insumos e gera `docs/IMPORTACAO-WORKBOOK-PREVIA.md`. Ele não altera o workbook, não executa migrations e não grava dados no banco.

Depois de revisar a prévia e aplicar as migrations, faça a carga inicial em uma única transação:

```bash
npm run import:catalog -- "/caminho/para/Workbook_Gerenciamento_Seus_Brownies.xlsx" --confirm
```

Sem `--confirm`, o comando apenas valida novamente. Ele interrompe a operação se encontrar pendências, duplicidades ou SKUs já cadastrados; energia e mão de obra permanecem fora do estoque.

## Prévia segura do histórico

Após a carga do catálogo, a próxima etapa começa por uma prévia somente leitura do histórico:

```bash
npm run import:history:preview -- "/caminho/para/Workbook_Gerenciamento_Seus_Brownies.xlsx"
```

O comando lê locais/canais, vendas, compras/despesas, a planilha derivada de estoque e produção. Ele gera [IMPORTACAO-HISTORICO-WORKBOOK-PREVIA.md](docs/IMPORTACAO-HISTORICO-WORKBOOK-PREVIA.md), com hash da fonte, contagens, divergências, itens ignorados e pendências de vínculo. Não acessa o banco, não altera o workbook e não executa migrations.

As decisões históricas aprovadas usam o ano de 2026, locais inicialmente não classificados e vendas exclusivamente financeiras, sem baixa de estoque. Os 23 aliases de compras ficam no manifesto versionado, revisável e auditável [importacao-compras-aliases.json](data/importacao-compras-aliases.json), incluindo as regras específicas por `source_id` para os dois recheios Alispec de mesma descrição. Sem `--confirm`, o comando de importação atualiza a prévia e somente valida: não abre conexão com o banco nem grava dados.

O catálogo e o histórico já foram carregados no ambiente informado. Os comandos abaixo ficam apenas como referência para uma instalação nova e não devem ser repetidos sobre uma base já importada:

```bash
npm run db:migrate
npm run import:history -- "/caminho/para/Workbook_Gerenciamento_Seus_Brownies.xlsx" --year 2026 --confirm
```

O segundo comando executa uma transação única, cria os produtos de estoque previstos pelo manifesto quando ainda não existirem e interrompe toda a operação diante de ID externo, hash, alias ou incompatibilidade de SKU/nome já cadastrados.

## Prévia de produção e fichas técnicas

Antes de criar modelos ou importar produção, gere a prévia somente leitura:

```bash
npm run production:preview -- "/caminho/para/Workbook_Gerenciamento_Seus_Brownies.xlsx"
```

Ela analisa a ficha técnica-base, os cartões de produto, planejamentos, rendimentos, perdas e custos operacionais, gerando [IMPORTACAO-PRODUCAO-WORKBOOK-PREVIA.md](docs/IMPORTACAO-PRODUCAO-WORKBOOK-PREVIA.md). Não abre conexão com o Neon, não altera o workbook, não cria migration e não grava dados.

O manifesto versionado [receita-base-vinculos.json](data/receita-base-vinculos.json) registra os sete vínculos físicos aprovados, os dois requisitos operacionais históricos, as tarifas vigentes aprovadas (energia: R$ 0,85/kWh; mão de obra: R$ 12,50/h), embalagens individuais e 12 componentes de recheio por perfil. As quantidades de recheio são decisão operacional aprovada pela usuária — 20 g para 5×5 e 40 g para 7×7 —, não dados extraídos do workbook. As tarifas têm ID, hash, payload de origem e data de vigência; o custo histórico da ficha continua somente como auditoria. Somente um lote com data, quantidade real e confirmação poderá gerar consumo de insumos e entrada de produto final. Energia e mão de obra permanecem custos operacionais, nunca estoque.

As migrations `0005_lovely_amazoness.sql`, `0006_dusty_jack_murdock.sql` e `0007_unique_post.sql` e a importação inicial de produção já foram aplicadas no ambiente informado: há uma receita-base, tarifas, 17 perfis, 17 registros `PLAN` e 12 componentes de recheio. Não repita `production:import` ou `production:profiles:sync` nessa base. Os planejamentos permanecem sem consumo, custo realizado ou movimento de estoque.

Consulte [a fundação do MVP](docs/MVP-01-FUNDACAO.md) para escopo, dependências externas e próximos passos.

## Produção real

A tela `/producao` cria lotes reais inicialmente em **rascunho**. A prévia consulta a receita-base ativa, os perfis de produção, recheios, embalagens, tarifas vigentes e saldo calculado de estoque. Salvar o rascunho não cria movimentação.

Ao concluir explicitamente um lote, o Cacau executa uma única transação: bloqueia os insumos envolvidos, revalida saldo e rendimento, baixa ingredientes/recheios/embalagens, registra entradas dos produtos finais, custos de energia e mão de obra com a tarifa efetivamente aplicada, e fecha o lote. Não é possível concluir duas vezes nem deixar estoque negativo.

O cálculo de ocupação é `quantidade produzida ÷ rendimento do perfil`. A capacidade restante se torna **Bordinhas** (coproduto), sem embalagem individual. Se a quantidade de Bordinhas for menor que o saldo sugerido, a diferença precisa ser declarada como perda manual com motivo; não há perda automática. Produtos PLAN importados do workbook não aparecem como lotes reais e nunca movimentam estoque.

O custo dos itens físicos segue o custo médio ponderado perpétuo reconstituído pelas movimentações; cada consumo grava o custo efetivamente usado. Energia e mão de obra são custos operacionais, fora do estoque, com quantidade, unidade, tarifa e valor registrados no lote.

As migrations incrementais abaixo preparam esse fluxo e ainda não foram aplicadas:

```bash
npm run db:migrate
```

Revise antes `drizzle/0008_high_rumiko_fujikawa.sql` e `drizzle/0009_lethal_pyro.sql`. Após a aplicação, use a tela **Produção** no painel; não há importação automática nem efeito sobre vendas históricas.
