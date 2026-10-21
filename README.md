# Seus Brownies — Cacau v1

Painel operacional para organizar produtos, compras, estoque, produção, vendas,
despesas e relatórios dos Seus Brownies.

Consulte o [estado canônico do projeto](docs/governance/PROJECT-STATUS.md) para saber o
que já foi entregue, o que está pendente e quais documentos preservam o
histórico auditável.

## Atualizações e estado atual

Checkpoint de **21/10/2026**: `main` em `b82e044`, PRs #44–#49 mescladas e
nenhuma PR ou issue aberta na consulta. O núcleo operacional está integrado;
a liberação definitiva de produção depende dos aceites no
[roadmap único](docs/governance/ROADMAP-CODEX.md). Relatórios datados preservam
evidências históricas, sem funcionar como filas paralelas.

| Área | Entrega atual |
| --- | --- |
| Acesso | Neon Auth, login/cadastro/OTP/reset, sessão SSR, RBAC no servidor, CSRF, Turnstile e limiter distribuído; primeiro acesso corrigido e publicado no HML |
| Catálogo e estoque | Produtos, insumos, embalagens, compras em kg/consumo em g, movimentos auditáveis, custos exatos e FIFO |
| Produção | Receitas/perfis versionados, rascunho e conclusão transacional, consumos, custos por lote, Bordinhas medidas e perdas justificadas |
| Vendas e financeiro | Confirmação, recebimento, entrega, CMV, lucro por competência separado do caixa, taxas, reembolso/crédito e fechamento auditado |
| Gestão | Dashboard, meta conjunta, cenários versionados, relatórios, diagnósticos de integridade e CSV seguro |
| Qualidade | TypeScript 7, Oxlint/Oxfmt, Knip, CodeQL, testes Node, laboratório PostgreSQL e navegador isolado/conectado |

O último checkpoint HML registrado usa código `bb76764`, versão `22733c04`,
com primeiro acesso e ordenação da razão de Relatórios publicados. A base
usada nesse HML possui 38 produtos, receita 2 ativa com 17 perfis completos
e cenário 2 ativo com 16 produtos orientativos. A original conserva sua
classificação `production`; autorizações históricas não a tornam laboratório.
As contagens são evidências registradas, sem nova consulta ao banco nesta revisão.

A análise do Work de 21/10 estimou **85% para o sistema interno** e **65%
incluindo WhatsApp/assistente e OCR**, com **60–100 horas restantes** para o
núcleo ou **180–300 horas no total** com essas integrações. São estimativas de
planejamento, não cobertura de testes ou aceite. Premissas e pacotes estão no
[roadmap](docs/governance/ROADMAP-CODEX.md#estimativa-de-planejamento--análise-do-work-de-21102026).

As prioridades restantes são autenticação real e aceite de permissões,
retenção/responsáveis/RPO/RTO e recuperação de Auth,
ambientes e futuras migrations, proteção da `main`, triagem de segurança,
celular físico e piloto autorizado. Há backup privado externo e automações
locais de backup/monitoramento; dependem do computador/app disponíveis.
WhatsApp/IA conversacional e notas por imagem/OCR continuam como evoluções.
SaaS, pagamentos ampliados e XLSX são condicionais e não bloqueiam por si o
uso interno. Não há compras ou lotes reais previstos nem fatos fictícios
criados no HML para demonstração.

Rodada automática de 21/10: restore dos bytes baixados do Drive comprovado,
com 38 tabelas/36 recibos exatos e catálogo independente. Na candidata
`2bcb597`, patch launch-editor 2.14.2, auditoria npm com zero vulnerabilidades,
560 testes Node, 40 browser e build isolado aprovados. Proposta de proteção
da main e procedimento de migrations preparados, sem aplicação. Essa
candidata ainda exige revisão/CI e integração. Consulte a
[evidência técnica](docs/governance/AUTOMATIC-READINESS-2026-10-21.md).

## Executar localmente

Use Node **22.23.2** (`.nvmrc`) e instale dependências com `npm ci`.
Na pasta deste repositório:

```bash
npm ci
npm run ligar
```

O comando instala as dependências quando necessário, tenta buscar atualizações quando não há trabalho local pendente e abre o painel em `http://localhost:3000`.

## Salvar o trabalho

Ao encerrar, use:

```bash
npm run desligar
```

O comando registra as alterações no Git e sincroniza a branch quando houver conexão. Revise a mensagem do terminal caso exista algum conflito ou falha de conexão.

Agentes seguem [AGENTS.md](AGENTS.md): o encerramento não é automático durante
trabalho normal e nunca deve ser executado automaticamente na `main`.

## Banco de dados

O painel possui operações em `/categorias`, `/produtos`, `/compras`, `/estoque`,
`/producao`, `/vendas`, `/despesas`, `/financeiro` e `/relatorios`. O acesso ao
PostgreSQL acontece somente no servidor; a configuração de conexão não é
enviada ao navegador. Ingredientes e embalagens podem não ter preço de venda,
enquanto produtos finais exigem esse preço.

Compras criam entradas de estoque e vendas confirmadas ou pagas criam saídas. A visão geral mostra indicadores calculados do banco e apresenta estados vazios quando ainda não existem registros.

As atualizações específicas até `0033` já possuem 36 recibos no alvo
autorizado. `npm run db:migrate` permanece um **preflight offline bloqueante**;
`db:prepare`/`db:review` preparam e revisam sem executar SQL. Instalação ou
atualização em outro destino exige classificação independente, recuperação,
plano e autorização próprios. Não reaplicar recibos nem usar `db:push` como
atalho. Consulte o [ADR de migrations](docs/governance/MIGRATION-CHAIN-REMEDIATION-ADR.md).

## Testes e relatórios

Execute as regras determinísticas de dinheiro, quantidade, produção, estoque e
agregação de relatórios com:

```bash
npm test
npm run lint
npm run typecheck
npm run check
npm run knip:check
```

Lint e formatação usam Oxlint/Oxfmt. Knip oferece diagnóstico completo em
`npm run knip:audit` e gate de baseline em `knip:check`; CodeQL cobre JS/TS,
Python e GitHub Actions. Consulte [cobertura e triagem](docs/governance/KNIP-CODEQL.md).
Builds devem seguir o [workflow isolado](docs/governance/DEVELOPMENT-WORKFLOW.md)
com HEAD versionado e árvore limpa; nenhum build de validação publica o sistema.

A [CI de b82e044](https://github.com/naiguelcabral/seus-brownies/actions/runs/39538349886),
a [validação de negócio/browser](https://github.com/naiguelcabral/seus-brownies/actions/runs/39538349936)
e o [CodeQL](https://github.com/naiguelcabral/seus-brownies/actions/runs/39538349907)
passaram: 560 testes Node, 39 casos de interface com fixtures, dez casos
conectados e ensaios de negócio em PostgreSQL. O fluxo conectado cobre
compra → produção → venda → recebimento/entrega → lucro, quatro perfis,
negações, revogação, cancelamento, crédito/reembolso, fechamento e CSV em
largura móvel. A identidade é sintética: não comprova Neon Auth/Turnstile
reais nem substitui o aceite humano. Detalhes em
[validação conectada](docs/governance/CONNECTED-QA-2026-10-20.md).

`test:e2e:isolated` e `test:e2e:connected` usam os laboratórios restritos
descritos no [protocolo de QA](docs/governance/QA-VALIDATION-PROTOCOL.md).
Não executar a descoberta E2E de ambientes compartilhados sem cenário,
destino e referências autorizados. A reconciliação documental inicial não
repetiu suítes; a rodada automática posterior está registrada acima. Sucesso do CodeQL não
dispensa triagem de alertas; a `main` ainda estava sem proteção/ruleset na
consulta de 21/10.

A rota `/relatorios` oferece filtros por período, receita/volume/ticket,
ranking, estoque valorizado, diagnósticos e CSV. `/financeiro` distingue
competência e caixa e apresenta lucro após CMV, taxas e despesas classificadas,
sem descontar custos produtivos duas vezes. A homologação FIFO histórica está em
[HOMOLOGACAO-FIFO-FASE-2.md](docs/HOMOLOGACAO-FIFO-FASE-2.md): G6, G7 e G8
foram concluídos e G9 foi consolidado documentalmente. O único ajuste positivo
autorizado foi para `PROD003`, com o movimento `#22` e a camada FIFO `#3` de
`24.000` unidades e `R$ 60,48`. Naquele checkpoint, o estado reconciliado tinha `3` camadas, `2`
alocações e `0` reversões.

A referência `HML2-POS-G6-20260902` foi consumida e não pode ser reutilizada.
Qualquer novo cenário FIFO, escrita ou teste POST de idempotência exige
autorização explícita, referência inédita e auditoria própria.

## Prévia segura do workbook

Para analisar um workbook antes de qualquer importação, execute:

```bash
npm run import:preview -- "/caminho/para/Workbook_Gerenciamento_Seus_Brownies.xlsx"
```

O comando apenas lê as abas de cadastro de produtos e insumos e gera `docs/IMPORTACAO-WORKBOOK-PREVIA.md`. Ele não altera o workbook, não executa migrations e não grava dados no banco.

Em instalação nova, uma carga inicial exige revisão da prévia, destino,
migrations e autorização específica. O exemplo abaixo não deve ser executado
na original atual, que já contém os SKUs de venda:

```bash
npm run import:catalog -- "/caminho/para/Workbook_Gerenciamento_Seus_Brownies.xlsx" --confirm
```

Sem `--confirm`, o comando apenas valida novamente. Ele interrompe a operação se encontrar pendências, duplicidades ou SKUs já cadastrados; energia e mão de obra permanecem fora do estoque.

## Prévia segura do histórico

Para avaliar uma eventual carga histórica, gere primeiro a prévia somente leitura:

```bash
npm run import:history:preview -- "/caminho/para/Workbook_Gerenciamento_Seus_Brownies.xlsx"
```

O comando lê locais/canais, vendas, compras/despesas, a planilha derivada de estoque e produção. Ele gera [IMPORTACAO-HISTORICO-WORKBOOK-PREVIA.md](docs/IMPORTACAO-HISTORICO-WORKBOOK-PREVIA.md), com hash da fonte, contagens, divergências, itens ignorados e pendências de vínculo. Não acessa o banco, não altera o workbook e não executa migrations.

As decisões históricas aprovadas usam o ano de 2026, locais inicialmente não classificados e vendas exclusivamente financeiras, sem baixa de estoque. Os 23 aliases de compras ficam no manifesto versionado, revisável e auditável [importacao-compras-aliases.json](data/importacao-compras-aliases.json), incluindo as regras específicas por `source_id` para os dois recheios Alispec de mesma descrição. Sem `--confirm`, o comando de importação atualiza a prévia e somente valida: não abre conexão com o banco nem grava dados.

O catálogo e o histórico foram carregados no development histórico. A
original atual recebeu cadastros próprios sob referências auditáveis; isso
não comprova nem autoriza importar nela o histórico. Qualquer carga exige
plano específico, conferência de destino/fonte/duplicidade e autorização.
Referências já consumidas não podem ser repetidas. A importação histórica
usa transação única e aborta diante de conflito relevante; a existência do
comando não autoriza sua execução em base compartilhada.

## Prévia de produção e fichas técnicas

Para conferir a fonte do workbook, gere a prévia somente leitura:

```bash
npm run production:preview -- "/caminho/para/Workbook_Gerenciamento_Seus_Brownies.xlsx"
```

Ela analisa a ficha técnica-base, os cartões de produto, planejamentos, rendimentos, perdas e custos operacionais, gerando [IMPORTACAO-PRODUCAO-WORKBOOK-PREVIA.md](docs/IMPORTACAO-PRODUCAO-WORKBOOK-PREVIA.md). Não abre conexão com o Neon, não altera o workbook, não cria migration e não grava dados.

O manifesto [receita-base-vinculos.json](data/receita-base-vinculos.json)
preserva a fonte e premissas históricas. A receita ativa revisada usa oito ovos
e 850 g frios por forma; perfis completos incluem recheios, embalagens,
adesivos e cobertura conforme as decisões auditadas de 18/10. Referências
horárias históricas não substituem os totais reais de energia/mão de obra do
lote. Consulte [custos e recuperação publicados](docs/governance/COST-RECOVERY-FEES-HML-2026-10-18.md)
e as [regras de negócio](docs/governance/BUSINESS-RULES.md).

A original atual já possui receitas e perfis versionados; não repetir a
carga. As importações antigas de produção no development histórico e seus
registros `PLAN` continuam sem consumo, custo realizado ou movimento de
estoque. Planejamento não é produção realizada.

Consulte [a fundação do MVP](docs/MVP-01-FUNDACAO.md) para escopo, dependências externas e próximos passos.

## Produção real

A tela `/producao` cria lotes reais inicialmente em **rascunho**. A prévia consulta a receita-base ativa, os perfis de produção, recheios, embalagens, tarifas vigentes e saldo calculado de estoque. Salvar o rascunho não cria movimentação.

Ao concluir explicitamente um lote, o Cacau executa uma única transação:
bloqueia os insumos envolvidos, revalida saldo e rendimento, baixa ingredientes,
recheios e embalagens, registra entradas dos produtos finais e seus custos,
incluindo os totais reais de energia/mão de obra na versão revisada, e fecha
o lote. Não é possível concluir duas vezes nem deixar estoque negativo.

Na receita revisada, os rendimentos por forma são 48 simples/24 recheados
no 5×5 ou 24/12 no 7×7. **Bordinhas** são recuperação variável pesada por
lote, sem quantidade automática pela capacidade restante. O pacote vendável
tem 100 g, um saquinho e um adesivo; saldo não embalado fica separado.
Perdas são declaradas com motivo. Registros `PLAN` não aparecem como lotes
reais nem movimentam estoque.

Custos derivados preservam frações exatas internamente e arredondam somente
na apresentação, com duas casas. Na recuperação medida, o custo comum é
rateado por massa; o acabamento direto fica no produto consumidor. Consumos,
saldo e saídas conservam o total exato; projeções legadas em centavos/custo
unitário não substituem esse valor. Camadas FIFO preservam rastreabilidade
do custo até o CMV da venda. Energia/mão de obra apropriadas ao lote não são
deduzidas novamente como despesa. Veja o
[ADR de custos exatos](docs/ADR-0002-CUSTOS-EXATOS-E-EXIBICAO-MONETARIA.md).

O roteiro seguro para homologar esse fluxo está em
[HOMOLOGACAO-PRODUCAO-REAL.md](docs/HOMOLOGACAO-PRODUCAO-REAL.md). Ele não
autoriza nem executa migrations.
