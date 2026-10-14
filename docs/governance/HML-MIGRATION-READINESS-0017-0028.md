# Readiness das migrations 0017–0028 para HML

Data da revisão: 9 de outubro de 2026. **Não autoriza aplicação.** A PR #35
foi integrada somente como preparação, conforme instrução do Dono.
PR #35 integrada pelo merge `a542ec73d914bcca12090b38df69bf16a49e9bbf`.
CI pós-merge da `main`: [37944260848](https://github.com/naiguelcabral/seus-brownies/actions/runs/37944260848),
`push`, mesmo SHA, `completed/success`.
A reparação é separada na issue #36 e exige uma PR corretiva própria. Base Git:
`100d41c0f90730f5dc992fb707485468074666bf` (`origin/main`). A PR
[#34](https://github.com/naiguelcabral/seus-brownies/pull/34) foi integrada
em 2026-10-09 12:27 UTC por esse merge commit. CI pós-merge da `main`:
[#37930101604](https://github.com/naiguelcabral/seus-brownies/actions/runs/37930101604),
`success`, evento `push` no mesmo SHA. A árvore de origem estava limpa.
Worktree de revisão: `codex/hml-migration-readiness`.

## Decisão de readiness

**Aplicação HML bloqueada.** A `0017` referencia `products.unit` no corpo
da função e no `CREATE TRIGGER`; o schema desde `0000` e o Drizzle atual
usam `products.measurement_unit`. PostgreSQL 17 rejeitou o trigger com
`42703`. O migrador Drizzle reverteu integralmente a transação de
`0017`–`0028`. Migrations publicadas, snapshots e journal permanecem
preservados nesta preparação. A tarefa [#36](https://github.com/naiguelcabral/seus-brownies/issues/36)
compara substituição da cadeia pendente, compatibilidade pré-migration e nova
linha derivada de `0016`. Nenhuma estratégia está aprovada. A preferência
inicial é substituir somente a cadeia comprovadamente não aplicada,
preservando SQLs/hashes/journal/snapshots antigos como evidência. Isso exige
inventário atual de todas as bases compartilhadas relevantes e comprovação
de ausência de `0017+`; estado desconhecido bloqueia a substituição.
Simplesmente adicionar uma `0029` não resolve,
pois a `0017` falha antes de alcançá-la. O teste diagnóstico de uma **cópia
temporária** da `0017` com o identificador correto não é migration candidata
nem autorização para editar o arquivo publicado.

Há outro gate: o projeto Neon identificado pela documentação tem branch
`development` com estruturas básicas ausentes na evidência histórica de
8 de outubro. A associação Worker HML ↔ banco não foi comprovada. Não escolher
outro branch por inferência.

## Alvo e evidência externa

Antes de qualquer SQL foram confirmados por `ENVIRONMENT-MATRIX.md` e
metadados MCP: projeto `cool-base-25902164` (`seus-brownies`), branch
`development` / `br-lively-term-ac9i0mvr`, não padrão e filho de
`production`, database `neondb`, PostgreSQL major 17. O outro projeto de
mesmo nome e o branch histórico `g1-auth-hml` não foram consultados.
O MCP disponível expõe permissão `ADMIN` e `run_sql` não comprova role ou
conexão somente leitura. **Nenhum SQL foi enviado ao Neon.** Portanto
`0000`–`0016` aplicadas, hashes HML, ausência de `0017`–`0028`,
volumes e drift atual são `state-unconfirmed`. A evidência de
`ENVIRONMENT-MATRIX.md` encontrou ausência de relações fundamentais em
`development/neondb`; é alerta histórico, não prova de estado atual.

## Inventário e rastreabilidade

Hashes SHA-256 são do SQL versionado, não de snapshots. `R` = risco de lock;
`D` = duração qualitativa em banco com volume desconhecido. Toda a cadeia é
transacional no migrador `drizzle-orm/node-postgres` instalado: os comandos
pendentes e as linhas do journal são executados em uma transação; a criação da
tabela de histórico ocorre fora dela se ela ainda não existir. O migrador
decide pelo último `created_at`; **não compara os hashes antigos**. Precheck
externo de todos os hashes é indispensável. Índices sem `CONCURRENTLY`,
alterações de tabelas existentes e FKs podem bloquear writers. Duração não
pode ser estimada quantitativamente sem volumes e ensaio em cópia relevante.

| Nº / SQL e hash SHA-256                                                                               | Origem, estruturas e dependências                                                                                                                                                                                                                                                                                                                                                           | R / D; dados; estado; recuperação                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0017_orange_the_hand.sql`<br>`ccaa9173aef5fda63ff980f4c1d254c0b040d7fe4df92f6f21046300c81fa256`      | Commit `e185388` (idempotência/FIFO): `expenses`, `purchases`, `sales` recebem chave/hash de idempotência e ator `varchar` anuláveis, sem default; três UNIQUE; função e trigger de proteção de tipo/unidade de `products`. Depende de `0016` e das tabelas operacionais. Consumidores: `operations/functions.ts`, `catalog/functions.ts`.                                                  | **Falha determinística** em `products.unit`. `ALTER TABLE`/UNIQUE/trigger impõem lock, potencial varredura das tabelas; duração média ou alta se grandes. Sem perda de dados pelo SQL, mas bloqueia writers. `needs-fix-forward`; decisão humana sobre estratégia auditável antes da cadeia. Retorno: transação revertida; após commit, restauração de branch ou correção prospectiva, nunca `DROP` presumido. |
| `0018_bouncy_odin.sql`<br>`c81a4674267795208c11a276509db789a364b39f485dfed34a30f966902079db`          | Mesmo commit: cria `operational_audit_events` com ator anulável, ação/entidade obrigatórias, `occurred_at now()`; três índices, sem FK. Consumidores: `operations/audit.ts` e writers.                                                                                                                                                                                                      | Lock nas novas relações, duração curta, sem dados prévios. `blocked` pela `0017`; recuperação por restauração/fix-forward, desativar writers novos se necessário.                                                                                                                                                                                                                                              |
| `0019_short_ulik.sql`<br>`14b618089bed74795e7b75951dbe85256f913fa09fa4753a8a2f13d202f4177b`           | Commit `712e0ca`, paridade workbook: enum `sale_adjustment_kind`; `management_settings` com PK, versão/default 1 e instante/default now; **INSERT** singleton com metas, custos e tolerâncias; `sale_items.reported_amount` anulável; `sales.adjustment_kind` NOT NULL/default `none` e motivo anulável. Consumo: gestão, vendas e relatórios.                                              | `ALTER` em vendas e itens: lock; D curta a média, dependendo de volume. DML de configuração embutida exige confirmação humana dos números antes da aplicação; não há backfill de vendas antigas. `needs-data-decision`; recuperação por branch/fix-forward.                                                                                                                                                    |
| `0020_colorful_kitty_pryde.sql`<br>`0519a66242fe34952f04b0014798265bf22f543ef09f14f9415060845e286add` | Mesmo commit: enums de prioridade/status; `action_plans` e `action_plan_history`, PKs, versão/default 1, status/prioridade/default, timestamps/default, UNIQUE plano+versão, FK `RESTRICT`, três índices. Consumo: `management/action-plans*`.                                                                                                                                              | Novas tabelas, D curta, sem dados prévios; sem remoção. `ready-for-disposable-test` condicional aos gates anteriores; retorno branch/fix-forward ou desativação funcional.                                                                                                                                                                                                                                     |
| `0021_short_korvac.sql`<br>`b3056b1417b2e5753fecf9c624fa59454eb0dcf13affcd7ace4d979da5664bba`         | Commit `b0b3faf`: `products.reorder_point numeric(14,3)`, `purchase_items.supplier_lot varchar(80)` e `expires_on date`, todos anuláveis, sem índices/FKs/default. Consumo: catálogo, compras, estoque.                                                                                                                                                                                     | `ALTER` nas tabelas existentes, lock curto a médio; histórico permanece NULL, sem backfill. `ready-for-disposable-test`; retorno branch/fix-forward/desativação de alerta.                                                                                                                                                                                                                                     |
| `0022_ambitious_hellcat.sql`<br>`c4b2df5f91cf12c0360ed3b71b6c9b2fb00e3cd5c78711dfd039ba3a9fe00e3cd5`  | Commit `56f0149`: `products.preferred_supplier_name varchar(160)` anulável, sem índice/FK/default. Consumo: catálogo; campo informativo, não seleciona compra.                                                                                                                                                                                                                              | `ALTER products`, lock curto; sem backfill. `ready-for-disposable-test`; retorno branch/fix-forward/desativação funcional.                                                                                                                                                                                                                                                                                     |
| `0023_strange_union_jack.sql`<br>`2fb019cac5f4fec814cc3ed8ed037254a4aead9666d6a5d43dd8b6824d67d750`   | Commit `8ddbba4`, G2: enums financeiros; `financial_events`, `financial_periods`, FKs para vendas/itens/autorreferência, UNIQUE de idempotência/período, checks de mês, fechamento, valores, correção e autorização, três índices, trigger de imutabilidade; `sales.delivered_at` anulável. Consumo: `finance/functions.ts`, relatórios.                                                    | FK/ALTER em `sales` podem bloquear; D média, depende de volume. Sem dados financeiros históricos criados: relatórios podem aparecer vazios. `ready-for-disposable-test` condicional; backfill e interpretação do histórico exigem decisão separada. Retorno branch/fix-forward; nunca apagar eventos.                                                                                                          |
| `0024_brainy_doorman.sql`<br>`cc0b7bbff17c86657b864c83291ad1d89c8eebd81f0e734e095c04b331eea039`       | Mesmo fluxo G2: `financial_events.revenue_effect` e `cash_effect numeric(12,2) NOT NULL DEFAULT 0`.                                                                                                                                                                                                                                                                                         | Tabela recém-criada na cadeia; lock curto, valor zero para linhas prévias se houver intervalo entre migrations. `ready-for-disposable-test`; validar efeitos, retorno fix-forward/branch.                                                                                                                                                                                                                      |
| `0025_talented_darwin.sql`<br>`00f1f4644d17f9a3aa55b1c233f12f81cbe1070ef9e472b2de22dffec93c7511`      | Mesmo fluxo G2: `financial_events.quantity numeric(14,3)` anulável.                                                                                                                                                                                                                                                                                                                         | Lock curto, sem backfill; `ready-for-disposable-test`; fix-forward/branch.                                                                                                                                                                                                                                                                                                                                     |
| `0026_shiny_edwin_jarvis.sql`<br>`e3072420477f960888bf427d7bec4187bd41da08afca2938fc1daace0355bc53`   | Commit `8403fe1`: `financial_events.settles_event_id` anulável; FK autorreferente `RESTRICT`, índice e checks que vinculam resgate a emissão, efeitos receita/caixa zero e autorizador. Consumo: crédito em `finance/functions.ts`.                                                                                                                                                         | FK/check em tabela recém-criada, D curta se vazia; pode varrer se houver dados. `ready-for-disposable-test`; validar crédito sintético, retorno fix-forward/branch.                                                                                                                                                                                                                                            |
| `0027_clear_morgan_stark.sql`<br>`6697ab771422c350b249172f84b8a944371d7c9b7c521b2e58060581c087dd9d`   | PR #12, commits `15959e0`/`0d4f62d`: enum status; `management_scenarios`, `management_scenario_mix`, `management_scenario_history`; PKs, UNIQUE de versão/mix/revisão e índice parcial de ativo único; FKs `RESTRICT` para cenário, produto e predecessor; checks de peso, dias e basis points; defaults de versão/status/revisão/instantes. Consumo: `management/scenarios*`, `/cenarios`. | FKs referenciam `products`; lock curto a médio. Mix preserva pesos exatos; sem seed. `ready-for-disposable-test`; retorno branch/fix-forward/desativar cenário.                                                                                                                                                                                                                                                |
| `0028_brave_xavin.sql`<br>`bb861a43bd5c8879fc1ebde85c0a8e402f80917ccd92c4b21f08ca9454a098e7`          | PR #12: `management_scenario_mix.product_name varchar(120) NOT NULL`, sem default. Depende da `0027` e da tabela **vazia**; nome é snapshot de produto.                                                                                                                                                                                                                                     | `ALTER` com lock; falha se houver qualquer mix inserido após `0027`. D curta se vazia. `needs-data-decision`: executar `0027`/`0028` sem janela de escrita intermediária. Retorno branch/fix-forward; não inventar preenchimento.                                                                                                                                                                              |

As migrations `0017`–`0028` constam uma vez, em ordem, no journal; os
snapshots `0017`–`0028` existem e encadeiam o Drizzle. `0012`/`0013`
foram migrations SQL manuais sem snapshots próprios; isso precede o escopo.
O schema TypeScript final declara as tabelas e colunas listadas. O trigger
manual da `0017` não é representado pelo snapshot e contradiz a coluna do
schema. Os commits de origem são rastreáveis por `git log -- drizzle/<arquivo>`;
`0019`–`0026` foram integradas pela PR #11 e `0027`–`0028` pela PR #12;
as PRs históricas #4/#5 não são caminhos de aplicação.

## Teste descartável e atomicidade

PostgreSQL local `17.11` em contêiner `postgres:17-alpine`, sem rede,
sem porta publicada, data directory em `tmpfs`; conexão por socket Unix.
Somente schema e dados sintéticos. O migrador oficial aplicou `0000`–`0016`
em ordem; as 17 linhas do histórico corresponderam exatamente aos hashes e
timestamps versionados. Ao executar as migrations publicadas `0017`–`0028`,
a `0017` falhou com `42703`. Após a falha havia ainda 17 registros e
nenhuma `expenses.idempotency_key`: rollback transacional comprovado.

Diagnóstico separado: uma cópia temporária da `0017` substituiu apenas
`products.unit` por `products.measurement_unit`. Nessa cópia, a sequência
até `0028` levou cerca de **156 ms**, resultou em 29 registros únicos,
435 colunas, 152 constraints, 112 índices e 45 FKs em `public`.
Reexecução do migrador levou cerca de **3 ms** e não duplicou registros.
`operational_audit_events`, `financial_events`,
`management_scenarios` e `product_name NOT NULL` foram conferidos.
Esses tempos só representam schema vazio local. Não provam duração, lock,
dados históricos, autenticação real nem HML; a cópia modificada não prova
aplicabilidade do SQL versionado. O contêiner deve ser descartado ao fim da
revisão.

## Compatibilidade de código e sequência

O código integrado já seleciona `reorder_point`, fornecedor, configurações,
eventos financeiros e cenários, e escreve idempotência/auditoria. Antes da
`0017`, consultas e mutações atingem colunas/tabelas ausentes; a versão
atual **não deve** ser promovida contra o schema `0016`. Durante
`0017`–`0028`, a transação única mantém a cadeia invisível aos outros
clientes até o commit, porém mantém locks; não permitir writers concorrentes.
Depois da `0028`, código antigo deve ser avaliado contra colunas aditivas,
constraints, trigger e valores padrão; compatibilidade integral não foi
demonstrada. O gatilho alterará o comportamento de edição estrutural de
produto. `0019` insere configuração financeira; `0023` não reconstrói
eventos históricos e `0028` pressupõe tabela vazia. Autenticação e RBAC
dependem do schema G1 e testes por papel. FIFO, vendas e produção exigem
reconciliação somente leitura antes/depois; relatórios financeiros e cenários
devem permanecer desativados até validação de dados e UI.

Sequência **proposta, sujeita a nova revisão**: (1) resolver a falha da
`0017` por mudança auditável aprovada; (2) identificar o database efetivo
do Worker e obter role estritamente read-only; (3) executar precheck, comparar
todos os hashes e drift; (4) aprovar parâmetros da `0019`, backup,
restauração e janela; (5) congelar writers; (6) aplicar a cadeia em uma
transação controlada por operador humano, sem deploy simultâneo; (7) executar
pós-checks read-only; (8) só então decidir publicação HML do código compatível
e homologação funcional por papéis. Se o alvo ainda não contiver
`0000`–`0016`, esta sequência é inaplicável: requer plano próprio.

## Backup, restauração e decisão de incidente

Responsável humano: Dono do sistema e operador de banco nomeado no formulário.
Janela: **não definida nem autorizada**. Só propor uma data depois da PR
corretiva, dos gates de dados e de recuperação, com congelamento de writers
e confirmação de baixa atividade. Limite máximo de
indisponibilidade, RPO e RTO: **pendentes de decisão humana**; não iniciar
sem valores aprovados. Cancelar se alvo/Worker, hashes, drift, CI, modo
read-only, volume, capacidade de restauração ou autorização não coincidirem.

Exigir ponto de recuperação identificável imediatamente antes da janela e
cópia independente criptografada fora do repositório, ambos com conclusão
verificada por status do provedor e ensaio de restauração em branch isolado
previamente autorizado. Retenção mínima **proposta**: 7 dias para o ponto e a
cópia; a janela de histórico do projeto foi reportada pelo MCP como apenas
6 horas, insuficiente para essa proposta. Confirmar plano/custo e retenção
real com humano. Preservar SHA, SQL/hash, timestamps, IDs de operação,
metadados de backup, resultados sanitizados e incidentes; nunca dumps ou
valores de negócio no Git.

Em falha antes do commit, verificar rollback da transação e manter writers
fechados até precheck novamente. Após commit, não executar SQL reverso
destrutivo improvisado: criar branch restaurada do ponto aprovado, validar
histórico, catálogo, contagens agregadas, autenticação e reconciliação
FIFO/CMV; o responsável humano decide eventual corte após avaliar lançamentos
posteriores. Se houver novos fatos financeiros/estoque, preferir fix-forward
auditável ou desativação funcional. Incidente comunica Dono, operador DB e
responsáveis por aplicação; registrar cronologia, impacto e decisão. Por
migration: `0017`–`0019` exigem decisão humana/restauração ou fix-forward;
`0020`–`0022` admitem desativação funcional/fix-forward;
`0023`–`0026` exigem fix-forward ou restauração aprovada sem apagar fatos;
`0027`–`0028` admitem desativação de cenários/fix-forward ou restauração
aprovada. **Nenhum rollback SQL está comprovado.**

## Prechecks e pós-checks para futura janela

`scripts/hml-migration-readiness.mjs` é um verificador **offline** de
evidência JSON sanitizada. Exige `--mode pre|post --environment hml`,
identificadores exatos de projeto/branch/database, `--ack-read-only
hml-read-only` e `--evidence <arquivo>`. Não abre conexão, não carrega
`.env`, não lê credenciais, não aplica SQL e rejeita alvo de produção.
Exige também `--expected-ci-sha <40 hex>` e `--expected-ci-run-id <id>`
obtidos pelo operador de uma CI pós-merge conferida no GitHub. Rejeita SHA,
run, repositório, workflow, status, evento ou branch divergentes: exige `CI`,
`completed/success`, evento `push` na `main` de `naiguelcabral/seus-brownies`.
Não consulta o GitHub: valida somente os campos fornecidos contra a identidade
esperada, sem atestar a origem ou integridade do JSON.

Confere declarações de read-only/role sem escrita, PostgreSQL 17+, declaração
de backup verificado no precheck e hashes/timestamps do histórico. Além dos
nomes, compara as definições representadas pelos snapshots `0016`/`0028`:
colunas (tipo, default, nulabilidade e PK), índices, FKs/ações, checks,
UNIQUE, PKs compostas, políticas/RLS e enums/ordem dos valores. Chaves de
objetos são canonicalizadas; ordem de arrays semanticamente relevantes é
preservada. `tables.<nome>.definitions` usa os campos `columns`, `indexes`,
`foreign_keys`, `checks`, `uniques`, `primary_keys`, `policies` e
`rls_enabled`; `enums` usa o formato do snapshot. A coleta independente deve
normalizar o catálogo PostgreSQL para esse contrato sem copiar o snapshot
como observação.

**Limite obrigatório:** checks SQL manuais ausentes dos snapshots e funções/
triggers ainda requerem comparação independente das definições reais. Nomes
iguais não provam semântica igual; serial/defaults e expressões exigem
normalização comprovada. Nenhum coletor PostgreSQL foi implementado ou
executado nesta revisão. A saída sempre registra `application_authorized:
false` e os gates remanescentes. Exit code 0 significa apenas consistência
do JSON fornecido no escopo declarado; não comprova ausência integral de
drift, permissões reais, backup restaurável ou autorização de aplicação. Formato JSON e exemplos sintéticos estão no teste
`test/hml-migration-readiness.test.ts`. Evidência real deve ser obtida por
operador com conexão **comprovadamente somente leitura**, transação
`BEGIN READ ONLY`, identificadores explícitos e SELECTs exclusivamente de
`current_setting`, `information_schema`, `pg_catalog` e
`drizzle.__drizzle_migrations`. A role não deve ter INSERT/UPDATE/DELETE,
DDL nem superuser. Guardar só metadados; jamais valores de linhas de negócio.

Antes do precheck, operador confere `git status --porcelain`,
`git rev-parse HEAD`, CI `gh run list --commit <SHA>`, artefato e branch
Neon; registra disponibilidade e ensaio do backup. No pós-check, capturar
nova evidência e exigir 29 migrations **exatamente uma vez**, hashes,
snapshot `0028`, constraints/FKs/índices, e verificar em ambiente autorizado
autenticação e RBAC por papel, catálogo, compras, vendas, produção, FIFO,
relatórios e cenários. Testes funcionais de escrita exigem referências novas
e autorização independente; esta revisão não os executa. Conferir ausência
de regressão crítica antes de reabrir writers.

## Formulário de autorização futura

- Alvo: projeto `________`, branch ID/nome `________`, database
  `________`, associação Worker HML confirmada por `________`.
- SHA Git, ID da execução e CI verde pós-merge: `________`; SQL/hashes revisados por
  `________`; estratégia corretiva aprovada e PR separada: `________`.
- Histórico `0000`–`0016`, hashes e drift: `________`; `0017`–`0028`
  ausentes: `________`; role read-only comprovada: `________`.
- Valores da `0019` aprovados pelo Dono: `________`; política de dados
  históricos G2: `________`.
- Gate separado `0028`: estado do mix, política de nomes e execução sem
  intervalo de escrita aprovados: `________`.
- Definições reais de SQL manual, funções/triggers e normalização do catálogo
  comparadas independentemente: `________`.
- Backup/ponto/retensão/cópia independente e ensaio: `________`; RPO
  `________`; RTO `________`; limite de indisponibilidade `________`.
- Data/janela/freeze e comunicação: `________`; operador `________`;
  aprovador de negócio `________`; aprovador de recuperação `________`.
- Critérios de cancelamento/rollback/fix-forward aceitos: `________`;
  plano de pós-check e homologação por papel: `________`.
- **Autorização específica para aplicar as migrations no alvo acima**,
  distinta da aprovação desta PR: nome, data, escopo e registro `________`.

Sem todos os campos, manter `BLOCKED`. Esta PR não altera schema histórico,
Neon, HML, Worker, Cloudflare, secrets, deploy nem dados compartilhados.
