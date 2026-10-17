# Estado canônico do projeto — Cacau v1

## Incidente de restore — 17 de outubro de 2026

Snapshot da baseline criado, mas restore com finalização padrão promoveu a
cópia e moveu o endpoint original. Branch/dados originais preservados; nenhuma
migration externa executada. Recuperação corretiva de endpoints foi rejeitada
pela revisão automática por falta de consentimento específico e risco de
interrupção. Plano e IDs em `NEON-RESTORE-INCIDENT-2026-10-17.md`.
Não aplicar migrations nem inferir a branch alvo pelo nome atual/default.

## Redefinição de senha HML — 17 de outubro de 2026

Inventário ampliado autorizado confirmou ausência de tabelas/views/sequences
de aplicação em `public`/`drizzle` e dos dois enums auth. Plano restrito a
`0000–0016`, sem alterar originais, validado em PostgreSQL 17 descartável:
journal real, reset auditado com provedor simulado, reaplicação sem duplicação
e rollback preservando schema do provedor. Plano/snapshot/cópia/DDL pendentes
em `AUTH-BASELINE-0016-EXECUTION-PLAN.md`; nenhuma escrita externa realizada.

Catálogo mínimo executado após exceção humana explícita, READ ONLY confirmado:
as três tabelas de autenticação estão ausentes em todos os schemas e o journal
`drizzle.__drizzle_migrations` também está ausente em `neondb` do alvo declarado.
Isso bloqueia tentativas de login, reset e autorização de sessão. Nenhum DDL,
DML, vínculo, role/grant ou credencial alterado. Inventário mínimo de baseline
preparado para nova autorização antes de propor migrations com histórico
desconhecido; não presumir que a base esteja vazia.

Retomada com 100% de franquia principal e preflight concluído. Tentativa
posterior ao diagnóstico retornou `42P01` na auditoria inicial: relação SQL
inexistente. Writer usa `auth_audit_events`, pré-requisito da migration `0014`.
Ausência física versus resolução por schema/destino ainda requer catálogo.
SQL mínimo READ ONLY executado sob exceção explícita para o MCP administrativo;
resultado acima. Nenhuma migration, role/grant ou mudança de credencial.

Nova tentativa sem recebimento: observabilidade confirmou três falhas de
auditoria inicial e nenhuma chamada ao Neon. A causa subjacente da auditoria
ainda não é observável; preparado diagnóstico local por códigos permitidos,
sem mensagens/SQL/segredos e sem enfraquecer o bloqueio. Diagnóstico publicado
após autorização: `f168418a`, 100% do tráfego. Código agora confirmado acima.
Pausa anterior por reserva: 5% restante, reset 17/10 às 14:51:35 BRT; renovada.
Handoff em `HML-PASSWORD-RESET-2026-10-17.md`.
Não aplicar migrations ou mudanças de credenciais por inferência.

Relato de falha de login e e-mail de redefinição não recebido. MCP confirmou
ausência de `PASSWORD_RESET_REDIRECT_ORIGIN` no Worker e apenas localhost
nas origens confiáveis do Neon Auth do alvo declarado `production`.
Configuração HML corrigida localmente (`bb1717d`) e teste de regressão preparado;
475 testes, tipos, lint, formatação e build HML isolado aprovados.
Após autorização delimitada, origem HTTPS exata adicionada e reconfirmada
no Neon; correção publicada em HML, versão `9ec9856d`, 100% do tráfego.
Callback correto, secrets/rate limit/observabilidade preservados por MCP.
Usuário solicitou novo link; entrega bloqueada pela auditoria inicial.
Erro individual de login ainda sem mensagem exata/correlação; não atribuir
à senha, SMTP ou schema por inferência. Diagnóstico SQL permanece desativado.
Evidência, aplicação proposta e limites em
[HML-PASSWORD-RESET-2026-10-17.md](HML-PASSWORD-RESET-2026-10-17.md).

## Diagnóstico de conexão SQL — 17 de outubro de 2026

Publicado em HML a partir da fonte `ee5acec`: deployment
`dfacbe23-55d6-4db2-8a58-3ed3d1bde48e`, versão
`6b737c00-e80b-4217-9b03-6d84829035e4`, 100% do tráfego,
confirmados pela CLI e MCP. Secrets preservados sem leitura de valores;
observabilidade remota preservada. Flag ausente, teste SQL ainda não executado.
Usuário confirmou login no Cacau; navegador do agente continua anônimo.
Operador relatou erro/acesso negado na página; texto exato solicitado para
distinguir sessão, permissão ou diagnóstico ainda desativado antes da ativação
temporária. Gates de migrations/auditoria permanecem abertos.

Histórico das tentativas anteriores:

Publicação/teste temporário autorizados pelo usuário. Fonte `0abf78b`, 474
testes e verificações aprovados; build HML isolado com chave pública real
aprovado. Login OAuth concluído e validado. Corrigido o acesso ao chaveiro na
etapa de deploy isolado (`6a780e1`). Nova tentativa foi recusada pela API por
permissão insuficiente; versão remota `d8673fd9` permanece ativa, flag ausente
e probe SQL não executado. Configuração HML agora preserva a observabilidade
remota (`ee5acec`). Ampliação OAuth proposta foi rejeitada pela revisão
automática por incluir permissão de rotas além da publicação; depende de
consentimento humano delimitado. Login no Cacau confirmado pelo usuário.
Autorização de deploy continua válida. Retomada em `SQL-CONNECTION-DIAGNOSTIC.md`.

Preparado localmente `/diagnostico-conexao`: acionamento manual por POST,
CSRF, permissão existente `access:manage`, flag de runtime desativado por padrão,
resposta sanitizada e sem cache. Cliente por operação com timeout, SELECT 1
em READ ONLY, rollback e fechamento; sem leitura de negócio/migration.
Publicação, ativação temporária e execução externa estão autorizadas, pendentes
da permissão OAuth adequada para publicar;
nenhum gate de destino ou auditoria foi fechado. Procedimento e limites em
[SQL-CONNECTION-DIAGNOSTIC.md](SQL-CONNECTION-DIAGNOSTIC.md).

## Identificação do alvo pelo operador — 17 de outubro de 2026

O usuário informou Worker → `steep-brook-51659857` /
`br-lingering-wind-acwh5wap`. MCP confirmou branch `production`, principal e
padrão, `ready`, Auth Better Auth em `neondb` e JWKS exato informado. O novo
deployment HML `475d3a10` usa versão `d8673fd9` a 100%; `DATABASE_URL` permanece
secret_text, sem valor lido. Declaração do destino SQL vem do usuário;
metadados comprovam Auth → branch, não schema/journal nem conexão do runtime.
Auditoria desse alvo principal precisa de escopo e acesso não gravável
aprovados; não reutilizar coletores HML que recusam produção.
Detalhes em [MIGRATION-0017-ISOLATED-REPAIR.md](MIGRATION-0017-ISOLATED-REPAIR.md).

## Reparo isolado da 0017 — 17 de outubro de 2026

Candidatas temporárias agora permitem checkpoint `0017`, separado de `0019`
e `0028`. Os 26 casos PostgreSQL 17 passaram, incluindo oito novos de sucesso
e rollback, nove referências de produto usado, idempotência nas três tabelas
e preservação de dados/journal. A cadeia ativa permanece intacta e bloqueada.
Suíte geral com 464 testes, tipos, lint, check e build CI isolado no commit
`2e56e59` aprovados. Não houve push, SQL externo, migration ou deploy.
Metadados Neon agora retornam as cinco branches inventariadas `archived`,
somente `neondb_owner` e zero snapshots nos dois projetos. Isso não comprova
histórico, alvo ou recuperação. Auditoria read-only, atestação Worker e
backup/restore continuam necessários antes da escolha ativa. Detalhes em
[MIGRATION-0017-ISOLATED-REPAIR.md](MIGRATION-0017-ISOLATED-REPAIR.md).

## Melhorias TypeScript/React — 16 de outubro de 2026

Após o pacote de segurança `201a1ee`, contratos opcionais exatos e acessos a
índices verificados em todo o projeto. Guards de resultados obrigatórios mantêm
falha controlada; consultas opcionais conservam ausência explícita. Regras React
de pureza/efeitos/imutabilidade/refs habilitadas, tema sincronizado por store e
hidratação pelo hook do framework. Tipos, lint, check e regressões direcionadas
aprovados, com 463 testes. Build HML isolado e smoke público com Chromium
aprovados no HEAD `072cea1`; pacotes locais de segurança `201a1ee` e melhorias
`072cea1` aguardam revisão/integração. Sem mudanças de regra financeira,
precisão, RBAC, sessão ou dados. Detalhes no registro de modernização abaixo.

## Correções de segurança — 16 de outubro de 2026

Pacote local após `23f9d85`: dependências corrigidas e versões TanStack explícitas;
auditoria reduzida de 26 entradas afetadas para zero. Instalação limpa, tipos,
lint, testes originais e regressões dos overrides, além de build isolado,
aprovados. Compatibilidade de cookies e telas de erro adaptada às APIs atuais.
Detalhes e limites em [SECURITY-MODERNIZATION-2026-10-16.md](SECURITY-MODERNIZATION-2026-10-16.md).
Revisão, CI remota e homologação real de autenticação continuam pendentes.
Nenhuma migration, escrita compartilhada ou publicação foi executada.

## TypeScript 7 e Oxc — validação local, 16 de outubro de 2026

Branch `codex/typescript-7-upgrade`: TypeScript 7.0.2 é o único compilador no
lockfile, sem alias ou API 6. ESLint/Prettier foram substituídos nos comandos
do projeto por Oxlint 1.88.0 com tipos e Oxfmt 0.73.0. Dependências externas
ainda podem utilizar Prettier internamente, como o gerador de rotas TanStack;
isso não participa dos comandos de lint/formatação do projeto.

O teste de composição do login extrai e executa o mesmo callback com Oxc.
Foram preservadas as regras nativas equivalentes, adicionadas regras explícitas
React/Hooks, ARIA e promises, e registrado o tratamento das diferenças em
[TYPESCRIPT-7-OXC-MIGRATION.md](TYPESCRIPT-7-OXC-MIGRATION.md).

Validação local: `npm ci`, typecheck, lint sem avisos, check Oxfmt de 267 arquivos
e 456 testes aprovados. Dos 39 arquivos de código existentes alterados, 36 têm
JavaScript emitido estruturalmente equivalente; os outros três contêm os ajustes
revisados de teste e nome local. Build HML isolado aprovado, usando HEAD com o
diff e os novos arquivos em diretório temporário, sem arquivos de ambiente e
com chave pública sintética. Nenhuma migration, escrita compartilhada ou
publicação. Revisão/integração e CI remota pendentes.

## Reconciliação da PR #39 — 14 de outubro de 2026 UTC

A PR #38 foi integrada em `b7a8dcf9` após CI `38492599540` e PostgreSQL
`38492599488` aprovados no HEAD `50a0b4a7`. A #40 já integra a main.
As PRs #4/#5 foram encerradas como redundantes: os HEADs são ancestrais da main.
A #13 foi atualizada sem conflitos, mas mantém o risco documentado de herança
do PAT por subprocessos. A #39 preserva as evidências de #38 e os formulários
externos; seu merge depende da CI desta reconciliação. Nenhum gate de aplicação
de migration, alteração financeira/histórica ou deploy foi encerrado.
Os relatos anteriores abaixo são históricos e não substituem este checkpoint.

## Reconciliação de merges — 14 de outubro de 2026 UTC

A PR #40 já foi integrada em `3372cf64`. A PR #38 foi reconciliada com essa
main preservando as duas séries de registros abaixo como histórico. Os conflitos
eram apenas inserções documentais. Esta revisão autoriza integração do pacote
de ferramentas e provas; a issue #36 e os gates externos continuam abertos.
A cadeia ativa `drizzle/` permanece idêntica à main. Nenhuma migration persistente,
backfill, mudança de credencial ou deploy foi executado.

## Sincronização supervisionada G3 — 13 de outubro de 2026

Implementação em branch `codex/g3-supervised-project-sync`, baseada na `main`
`1e5bd557`. CLI com read-only, dry-run, plano com digest e apply de observações
técnicas; coleta por MCP autenticado da sessão, sem copiar credenciais. Perfis,
checkpoint e logs permanecem privados/ignorados. Registro manual é conflito,
não adoção automática; merge/CI não concluem requisitos ou comprovam HML.
Primeira criação técnica real e repetição sem duplicação verificadas. Snapshot
do dashboard escrito e relido com contagens reais. 33 contratos com fixtures
sem rede passam. [PR #40](https://github.com/naiguelcabral/seus-brownies/pull/40)
publicada em draft; [CI 38393316644](https://github.com/naiguelcabral/seus-brownies/actions/runs/38393316644)
aprovada no commit `2ffa130`, com testes/lint/tipos/build isolado. O pacote
continua em revisão e não está integrado na main; registros manuais permanecem
preservados e dependem de revisão somente para eventual adoção.
Runbook: [PROJECT-SYNC.md](./PROJECT-SYNC.md). Nenhuma migration, aplicação HML,
deploy, mudança de segredo ou automação recorrente. Gates anteriores preservados.

## Revalidação #36 — 9 de outubro de 2026

- `main` `1e5bd557` e PR #38 draft `eaf00fd` revalidadas; CI main e
  quatro CIs da PR verdes. A cadeia ativa e as evidências anteriores foram preservadas.
- API Neon reconfirmou dois projetos, cinco bases `neondb`, apenas
  `neondb_owner`, endpoints `read_write`, sem snapshots registrados. CLI
  autenticada permite selecionar role, mas falta acesso de auditoria aprovado.
- MCP Cloudflare autenticado confirmou deployment `8268b409` e versão
  `e241b715` ativa a 100%; `DATABASE_URL` é secreto e seu destino não foi lido.
- Estado: `blocked` por acesso não gravável, abrangência externa e vínculo
  Worker→database não comprovados. Nenhum SQL externo, migration ou deploy.
- Evidência e itens mínimos para retomada:
  [MIGRATION-CHAIN-SHARED-EVIDENCE.md](MIGRATION-CHAIN-SHARED-EVIDENCE.md).

## Continuidade #36 — acesso externo ainda bloqueado

Inventário de metadados ampliado: os cinco branches retornam somente
`neondb_owner`; seus endpoints são `read_write`. O conector SQL não permite
selecionar papel não gravável. Nenhuma consulta SQL externa foi realizada.
A PR #38 inclui diagnóstico conservador de ACLs, provas apenas descartáveis
e o roteiro [MIGRATION-CHAIN-SHARED-EVIDENCE.md](MIGRATION-CHAIN-SHARED-EVIDENCE.md).
Acesso aprovado e vínculo Worker→database continuam requisitos para finalizar
#36; não criar papéis/grants ou substituir a cadeia implicitamente.

## Execução da tarefa #36 — candidatas e provas separadas

[PR #38](https://github.com/naiguelcabral/seus-brownies/pull/38) aberta em draft.
As três candidatas passaram em PostgreSQL 17 descartável, de `0016` e instalação
vazia, no commit `32c0f4e5c78f324fc3be2bd8dcfe084ae2acd0ba`:
[run 37961680179](https://github.com/naiguelcabral/seus-brownies/actions/runs/37961680179),
16 casos aprovados, incluindo rollback, hashes/timestamps, catálogo real,
reaplicação e invariantes. Comparação e limites em
[MIGRATION-CHAIN-EXPERIMENTS-0016.md](MIGRATION-CHAIN-EXPERIMENTS-0016.md).
A CI do SHA final da PR deve estar verde antes de sua revisão; não há merge automático.

O inventário de metadados encontrou dois projetos Neon e cinco branches, mas
históricos `0017+`, catálogos, papel estritamente não gravável e vínculo Worker→DB
continuam não comprovados. Nenhum SQL externo foi executado. A substituição ativa
permanece bloqueada; `drizzle/` continua intacto. Próxima dependência: completar
essas evidências externas para avaliar a candidata de substituição preferida.
Gates `0019` (finanças) e `0028` (cenários) permanecem decisões separadas.
**HML, migrations, backfill e deploy seguem sem autorização.**

## Pacote de gates de evidência — 9 de outubro de 2026

- PR #35 integrada e CI pós-merge verde; base atual `1e5bd557` com CI
  `37944960379` verde. Branch `codex/hml-migration-evidence-gates`.
- Preparados matriz sanitizada, proposta de acesso mínimo, verificador sem
  conexão/credenciais, sanitizador local do destino e formulários 0019/0028.
- Metadados Neon e deployment/versão do Worker reconfirmados; histórico,
  schema, backup/restore e vínculo efetivo continuam `unverified`.
- Acesso externo `blocked`; declaração e decisões `pending-human`.
  Cadeia ativa preservada, nenhum SQL externo, migration, backfill ou deploy.
- Referência: [HML-MIGRATION-EVIDENCE-GATES.md](HML-MIGRATION-EVIDENCE-GATES.md).
- Próximo passo exato: operador preenche
  [HML-DATABASE-OPERATOR-ATTESTATION.md](HML-DATABASE-OPERATOR-ATTESTATION.md),
  fornece acesso privado já aprovado e referência independente de catálogo;
  Dono preenche os dois formulários de decisão. Não inferir fechamento de gate.

## Revisão do pacote preparatório #35 — 9 de outubro de 2026

- PR #35 integrada pelo merge `a542ec73d914bcca12090b38df69bf16a49e9bbf`.
  CI pós-merge da `main`: [37944260848](https://github.com/naiguelcabral/seus-brownies/actions/runs/37944260848),
  `push`, mesmo SHA, `completed/success`.
  Integração exclusivamente preparatória; não autoriza migrations ou deploy.
- Verificador offline exige SHA/ID da CI pós-merge esperados e compara as
  definições declaradas nos snapshots, além dos nomes. Seu JSON de saída
  sempre informa `application_authorized: false`; coleta independente e
  definições SQL manuais/funções/triggers permanecem pendentes.
- Tarefa separada [#36](https://github.com/naiguelcabral/seus-brownies/issues/36):
  comparar três estratégias e provar atualização de `0016` e instalação vazia
  em PostgreSQL descartável. Preferência inicial pela substituição da cadeia
  pendente condicionada à comprovação de ausência de `0017+` em todas as bases
  compartilhadas relevantes. Estratégia ainda não aprovada.
- `0019` (dados financeiros) e `0028` (cenários) são gates independentes.
  Nenhum SQL HML, alteração de migration, backfill ou deploy nesta revisão.
- CI da revisão `10e62c26`: PR `37943877875` e push `37943868409` verdes;
  429 testes, lint, typecheck e build isolado passaram. A CI pós-merge acima
  confirmou a integração. Os registros anteriores abaixo são históricos.

## Readiness das migrations 0017–0028 — 9 de outubro de 2026

A PR #34 foi integrada na `main` `100d41c` e a CI pós-merge
`37930101604` passou. A revisão local em PostgreSQL 17 descartável
encontrou falha determinística na `0017`: o trigger usa `products.unit`,
mas a coluna versionada é `measurement_unit`. A cadeia publicada foi
revertida pelo migrador e não está pronta para HML. A consulta SQL HML
permanece bloqueada porque a conexão MCP disponível não comprova modo
somente leitura; metadados confirmam apenas o alvo documentado. O plano,
matriz, backup e gates estão em
`HML-MIGRATION-READINESS-0017-0028.md`. Nenhuma migration foi aplicada em
ambiente compartilhado por esta preparação; ausência global de aplicação de
`0017+` continua não comprovada.

## Integrações consolidadas — 8 de outubro de 2026

O lote que compõe #19, #20, #24, #26 e #27 preserva o writer transacional,
diagnósticos somente leitura e precisão monetária. Não inclui migration,
infraestrutura, segredo, banco compartilhado ou correção automática de
estoque/FIFO/CMV. A PR #32 foi integrada em `main` com CI verde. A PR #31 de
relatórios/FIFO também foi integrada com CI `37804204150` verde.

O lote plataforma/governança compõe #14, #21, #22, #23, #25, #28 e #29 sem
migrations, deploy, escrita externa ou mudança de política. Telemetria é
allowlisted, memória local continua privada/atômica, hooks permanecem locais e
o smoke público bloqueia tráfego externo no modo isolado.

As três integrações #31–#33 compõem a `main` consolidada
`98172b97076415c4bb98554e1c6c82928bbe3895`. A CI da #33
(`37834057113`) passou. A reconciliação pós-integração está registrada em
`POST-INTEGRATION-RECONCILIATION-2026-10-08.md`; ela mantém #13 fora da
ancestralidade e enumera migrations e gates ainda pendentes.

## Entrega local em revisão — A25, 8 de outubro de 2026

Conclusão de produção com sete cenários determinísticos do writer real usando
Drizzle fake: conclusão única, custos/saídas/FIFO, insuficiência de insumo e
rollback em falhas posteriores. A extração do writer preserva o corpo da
transação, a validação e a autorização do servidor. A prova local não substitui
homologação PostgreSQL, operação física ou aprovação de produção.

Atualizado em 9 de outubro de 2026, com evidências históricas datadas abaixo,
após revisão de código, migrations,
testes, rotas, documentação e estado público de HML.

Este documento é a referência canônica de alto nível para o estado atual do sistema. Registros históricos de homologação, importação e decisões específicas permanecem válidos como evidência, mas não substituem este resumo.

## Produto

- Negócio: Seus Brownies
- Sistema: Cacau v1
- Objetivo atual: painel operacional rastreável para catálogo, compras, estoque, produção, vendas, despesas e relatórios.

## Stack oficial

- TypeScript
- React
- TanStack Start
- TanStack Router
- Drizzle ORM / Drizzle Kit
- PostgreSQL no Neon
- Tailwind CSS
- Zod
- Cloudflare Workers
- Node test runner
- Playwright
- Git / GitHub

## Estado entregue

### Operação principal

- Categorias: implementado.
- Produtos: implementado.
- Compras: implementado com entrada de estoque transacional.
- Estoque: implementado por razão de movimentações; saldo não é editável diretamente.
- Vendas: implementado; vendas confirmadas ou pagas movimentam estoque quando aplicável.
- Despesas: implementado.
- Produção: fluxo real implementado com rascunho e conclusão transacional.
- Relatórios: implementados em nível operacional inicial.

### Custos e estoque

- Custo médio ponderado usado onde previsto no fluxo atual.
- Estrutura FIFO/CMV existe e foi homologada em ambiente de desenvolvimento.
- Camadas, alocações, lifecycle e reconciliação FIFO possuem testes e documentação própria.
- Energia e mão de obra são custos operacionais, nunca itens de estoque.
- Bordinhas é coproduto, não perda automática.
- Auditoria local de produção distingue quantidades planejadas e realizadas
  por saída, diferença física exata e custo alocado informado. Lacunas não
  viram produção realizada; homologação visual permanece pendente.
- Checklist `PRODUCTION-READINESS.md` preparado para revisão humana; não
  declara produção pronta nem comprova schema ou homologação no ambiente.

### Observabilidade local

- Telemetria de auth em JSON estrutura evento/nível/requestId e aplica
  allowlist em runtime. Campos extras, motivos inválidos e IDs arbitrários
  não são serializados. Nenhuma política de sessão foi alterada.

### Ambientes — evidência de 8 de outubro de 2026

- `ENVIRONMENT-MATRIX.md` registra SELECT 1 e introspecção no alvo exato
  `development`/`neondb`: relações consultadas de produção/FIFO/G2/cenários
  ausentes. Não substitui homologações históricas em outro branch.
- Settings somente leitura de `cacau-v1-hml` não retornam o binding de
  rate limit versionado; última publicação observada de 7 de setembro.
  Associação Worker × database e publicação continuam gates humanos.

### Dados e migrações

- Catálogo e histórico de 2026 já foram importados no ambiente informado.
- Prévia somente leitura existe para catálogo, histórico e produção.
- Migrations Drizzle já foram aplicadas no ambiente autorizado até as versões documentadas nos registros históricos.
- As migrations `0017` (idempotência, autoria e proteção estrutural de
  produto) e `0018` (auditoria operacional) estão preparadas para revisão;
  não foram aplicadas a nenhum banco nesta missão.
- Não repetir cargas ou homologações já consumidas sem autorização explícita.

### Qualidade

- Checkpoint local de 8 de setembro na branch `codex/audit-remediation`:
  `npm test` aprovou 248 casos, `npm run lint` e `npm run typecheck` passaram.
  O build HML isolado passou no HEAD atual com chave pública sintética e sem
  carregamento de arquivo de ambiente; o aviso de secrets operacionais
  ausentes no SSR é esperado nessa prova. Um workflow versionado prepara
  `npm ci`, testes, lint, tipos e esse build isolado, sem deploy ou migration.
- Exportação CSV local de relatórios operacionais está implementada sobre os
  agregados já autorizados. Ela preserva os decimais como texto e neutraliza
  prefixos de fórmula de planilha; não cria endpoint público, arquivo remoto ou
  integração externa. O build HML isolado repetido no checkpoint dessa entrega
  passou com chave pública sintética. A entrega de XLSX permanece fora do
  escopo atual.
- A primeira CI remota falhou porque o modo local `--dry-run` do controlador
  exigia Codex CLI sem utilizá-lo. A correção e sua reprodução sem CLI estão
  aprovadas na CI `34268997522`, que também confirmou a exportação CSV e
  o build isolado.
- Busca textual, período e paginação de 20 itens para o histórico de despesas
  estão implementados sobre a Server Function já autorizada, com estados de
  carregamento/erro. O build isolado e a CI `34270184144` desse checkpoint
  passaram.
- O histórico de compras agora filtra fornecedor e período no servidor,
  pagina 20 itens com ordem estável e preserva a negação de histórico ao
  Funcionário. Testes direcionados, lint, typecheck e build HML isolado
  passaram localmente e na CI `34295688527`; a homologação de interface depende
  de ambiente autorizado.
- O ranking local de top 10 produtos por unidades usa ID de catálogo quando
  disponível, preserva itens históricos sem vínculo em grupo explícito e
  ordena quantidades exatas. O modelo ainda não oferece sabor canônico para
  um ranking por sabor; a interface aguarda homologação.
- O histórico de vendas agora filtra cliente, status e período no servidor,
  pagina 20 itens com corte final inclusivo de data em UTC e preserva a negação
  de histórico ao Funcionário. Testes direcionados, lint, typecheck e build
  HML isolado passaram localmente e na CI `34296133493`; a homologação de
  interface depende de ambiente autorizado.
- O catálogo agora filtra nome/SKU, tipo e situação no servidor, pagina 20
  produtos em ordem estável e mantém os controles de escrita fora do papel
  Funcionário. Testes direcionados, lint, typecheck e build HML isolado
  passaram localmente e na CI `34296485813`; a homologação de interface depende
  de ambiente autorizado.
- Em 5 de outubro, a PR #9 foi integrada na `main` pelo commit
  `428bcd0f9b5b17e9cde5f1dbbcf863664ffac4aa`. A CI da PR (`37374731288`) e a
  CI pós-merge (`37385292264`) passaram: `main` usa exclusivamente o build de
  CI arquivado/isolado, enquanto `build:hml` permanece bloqueado para execução
  direta nela. Não houve deploy, migration, acesso a segredo ou mudança de
  negócio.
- O follow-up documental de segurança/qualidade registra retenção segura de
  artefatos Playwright, vulnerabilidades conhecidas e gates de sessão,
  auditoria e Turnstile. Artefatos históricos rastreados foram preservados sem
  inspeção de conteúdo; novos `playwright-report/` e `test-results/` são
  ignorados. A PR #10 foi integrada por merge commit
  `60ae6ec3049500cc7cad0171ddaccf03f75c8cb0`; sua CI (`37460962766`) e a CI
  pós-merge da `main` (`37461237980`) passaram. A próxima reconciliação
  prevista é a PR #11, que exige revisão isolada de migrations e regras
  financeiras antes de qualquer integração.
- A PR #11 foi integrada por merge commit
  `baf9c4ceb97a1f66bb583f0fc6364cebf5867a6e`, partindo da `main`
  `968e9a93fe0c67611c8afcd47eb419203bccdcd8`. Sua CI de PR
  (`37524206463`) e a repetição verde da CI de push (`37524202791`) aprovaram
  o SHA `249bdd9`; a CI pós-merge da `main` (`37528365304`) aprovou testes,
  lint, typecheck e `build:ci-isolated`, sem `npm run build`. A entrega inclui
  paridade do workbook, G2-F1, entrega por competência com caixa separado,
  fatos financeiros e reconciliação somente leitura. As migrations
  `0019`–`0026` continuam apenas versionadas e não foram aplicadas. PRs #4 e
  #5 permanecem abertas e inalteradas. A próxima tarefa é criar
  `codex/wp-d-main-reconciliation` da `main` atualizada para uma nova PR WP-D
  em rascunho.
- A reconciliação WP-D foi concluída e integrada pela PR #12. A branch
  `codex/wp-d-main-reconciliation` foi criada da `main`
  `51f9657938d2b168c963341c6246a625514dd8a8`; a origem congelada
  `codex/wp-d-scenarios` (`c54f65bfa49607793b4d5e5eec7369585e42c6d3`) foi
  incorporada pelo merge de reconciliação `f155b94`. O merge commit da PR em
  `main` é `4590ca4e235f540d6552ab499e1140434355ce1f`; a CI pós-merge
  `37671827440` aprovou instalação, testes, lint, typecheck e
  `build:ci-isolated`. Os conflitos de reconciliação foram exclusivamente
  documentais e a `main` foi preservada como autoridade. As migrations
  `0027`/`0028` continuam somente versionadas, sem aplicação. A homologação
  HML de Dono, Gerente, Funcionário e negações por papel permanece pendente;
  requer autorização humana e navegador antes de uso operacional.
- A CI `34278599814` também passou no checkpoint publicado mais recente, com
  suíte, lint, typecheck e build HML isolado. A análise completa de dependências
  de 5 de outubro encontrou 16 vulnerabilidades (sete altas); ao omitir
  desenvolvimento, dez permanecem. Nenhuma atualização automática foi aceita:
  o dry-run encontrou conflito de peers do Better Auth e as cadeias Drizzle,
  Neon Auth e Wrangler exigem compatibilidade/revisão humana. O registro
  detalhado está em `SECURITY-QUALITY-FOLLOWUP-2026-10-05.md`.
- O build HML isolado agora reconhece checkout detached somente durante CI de
  build, usando a referência explícita da branch de trabalho; deploy nesse modo
  continua bloqueado. As CIs `34299895120` e `34299897403` passaram com essa
  proteção e com ordenação exata dos agregados de relatórios.
- A revisão local G1 cobre os cinco escopos do binding distribuído e rejeita
  respostas HTTP/JSON inválidas do Turnstile. A homologação com binding HML,
  desafio real, replay, e-mail, cookies, sessão e revogação permanece externa
  e está explicitamente separada na matriz de validação G1.
- Uma comparação operacional local de faturamento confirmado, unidades e
  ticket médio usa o período anterior de mesma duração em UTC e diferenças
  decimais exatas. É baseada na data da venda e rotulada separadamente da
  receita por competência de `/financeiro`; aguarda homologação de interface.
- O runbook de resiliência operacional documenta backup, restauração em branch
  descartável, RPO/RTO, rollback, observabilidade e retenção. Não há estratégia
  externa configurada nem ensaio de restauração: esses são gates humanos.

- O GitHub MCP dispõe de setup e launcher baseados no GNOME Keyring / Secret
  Service, com `LIGARTUDO --codex` para preflight e início do Codex. A presença
  da credencial foi confirmada pelo operador no host; a verificação em sandbox
  pode depender de teste no host. Consulte
  `GITHUB-MCP-PERSISTENT-AUTH.md` para operação e rotação.

- Rodada manual local de 7 de setembro: seis casos individuais adicionais
  de cooldown/desafio passaram; suíte de 37 arquivos e lint verdes. A07-R2
  está concluído no checkpoint humano `c28c267`, confirmado no Git local.
  A falha anterior de escrita em `.git` permanece no log. Build não executado;
  nenhuma evidência nova de publicação/HML.
  Detalhes e retomada em `AUTONOMY-HANDOFF.md`.

- A suíte determinística contém 34 arquivos de teste e passou integralmente na
  revisão de 6 de setembro; `lint` e `build` também passaram. O build emite
  apenas o aviso não bloqueante do Wrangler por não poder escrever logs fora do
  workspace.
- `npm run check` não está verde para o repositório inteiro: o Prettier aponta
  dívida de formatação em 92 arquivos, inclusive artefatos históricos e
  snapshots gerados. Os arquivos alterados nesta revisão foram formatados
  isoladamente; essa pendência não foi escondida com uma reescrita em massa.
- Há 11 specs Playwright, incluindo uma de rotas públicas de autenticação.
  Parte delas é intencionalmente `skip` ou requer autorização/referência
  exclusiva; a execução E2E completa de autenticação ainda depende de ambiente
  local autorizado que não carregue `.env` e de identidades de teste próprias.
- O código versionado possui 13 módulos de rota, CSRF global para métodos
  mutáveis e middleware estrutural de autorização aplicado às 30 Server
  Functions operacionais. A permissão é resolvida no servidor.
- O acesso ao banco valida `DATABASE_URL` com Zod no runtime server-side, sem
  carregar arquivos de ambiente nem incluir valores na mensagem de falha.

### Autenticação e acesso (G1)

- A base versionada contém login por e-mail/senha, cadastro, OTP, logout,
  recuperação por link/token, rate limit local, cooldown durável quando os
  bindings existem, Turnstile fail-closed e auditoria sanitizada de reset.
  A rota de reset é pública, mantém o token só em memória e o remove da URL.
- A experiência local foi exercitada para recuperação e login: a tela distingue
  sessão ausente, identidade sem allowlist e e-mail não verificado; este último
  segue para o OTP com reenvio de código.
- As migrations `0014`, `0015` e `0016` estão registradas no histórico Drizzle
  do branch Neon HML. Elas criam a infraestrutura de acesso e auditam a
  transição de `admin` para `owner`. Há um vínculo ativo de Dono e um de
  Gerente, ambos auditados e com e-mail verificado. Em 6 de setembro, o Dono
  concluiu manualmente recuperação de senha, OTP, login e acesso operacional
  completo em HML.
- A política atual é Dono, Gerente e Funcionário. Funcionário pode apenas ler
  catálogo e registrar compras/vendas; não recebe dashboard, relatórios,
  estoque, despesas, produção ou administração. Papéis anteriores permanecem
  somente como compatibilidade de transição, sem concessão a novas contas.
- O Worker HML `cacau-v1-hml` permanece publicado exclusivamente em
  `workers.dev`. Em 6 de setembro, o código atual foi publicado e o `403` de
  navegação pública foi corrigido: `/login` responde `200` e `/` sem sessão
  redireciona para `/login`. Uma leitura pública sanitizada em 7 de setembro
  reconfirmou esse comportamento, sem enviar cookie ou ler corpo. A
  homologação end-to-end ainda depende de login, OTP, sessão e autorização por
  papel reais.
- Em 7 de setembro, o widget Turnstile HML existente foi limitado a
  `localhost`, `127.0.0.1` e ao hostname HML; seu segredo foi atualizado
  somente no Worker e a site key pública foi incluída no bundle HML. A
  verificação descartável de Siteverify confirmou o segredo sem expô-lo.

## Ainda não entregue ou não homologado

- Decisão humana sobre a necessidade e a identidade do segundo Gerente; se
  aprovado, criar o vínculo auditado somente após a verificação de e-mail.
- Homologação integrada/E2E de login, logout, OTP, reset, cookie, sessão,
  autorização por papel e negações de acesso.
- Rate limit distribuído HML, desafio Turnstile real com rejeição de replay,
  confirmação de revogação de sessão e auditoria de todos os eventos de
  autenticação.
- Gestão de identidades/papéis por interface autorizada; hoje os vínculos HML
  foram operações administrativas auditadas.
- Auditoria de autoria para todas as mutações operacionais e, se desejado,
  desenho de dupla aprovação. A confirmação de certos ajustes de estoque já
  existe na UI, mas não é uma política geral de quatro olhos.
- WhatsApp Cloud API e webhook.
- Processamento idempotente completo para mensageria externa.
- OCR e armazenamento de documentos/notas.
- Pagamentos online.
- Regras completas de entrega.
- Deploy definitivo de produção e secrets finais do Worker.
- Relatórios gerenciais avançados, margem por produto/lote e análises adicionais.
- Adoção multitenant: plano em `MULTITENANCY-ADOPTION.md`; depende de decidir
  memberships, escopo de chaves e mapeamento auditável dos fatos históricos
  antes de gerar uma migration aplicável.

## Restrições atuais

- Dados HML existentes são trilha de auditoria e não devem ser limpos ou reutilizados.
- Cenários FIFO já consumidos não podem ser repetidos com a mesma referência.
- Nenhuma migration destrutiva pode ser aplicada automaticamente.
- Nenhum deploy de produção pode ser feito por agente sem aprovação humana explícita.
- `.env` e outros arquivos de segredo não devem ser lidos, alterados, versionados ou compartilhados por agentes.

## Próxima macrofase

1. Fechar a homologação segura de G1 e o acesso HML.
2. Consolidar CMV/margem e rastreabilidade.
3. Evoluir dashboard e gestão sobre dados já autorizados.
4. Iniciar mensageria, OCR e pagamentos somente após os gates anteriores.
5. Formalizar observabilidade, backup e deploy definitivo antes de produção.

## Checkpoint de remediação de migrations — 14 de outubro de 2026 UTC

Estado: `blocked` para aplicação compartilhada; `ready-for-review` para a
proteção local. A `main` de referência é
`7460420528f5a4512b824c09eb08df39a647a77b`, e a CI `38493978128` terminou
`success`. Em PostgreSQL 17 descartável, a cadeia oficial confirmou a falha
`42703` da `0017` e rollback integral ao estado `0016`. Não houve SQL em Neon,
migration compartilhada, DDL/DML externo, deploy, leitura de `.env` ou secret.

`npm run db:migrate` é agora um preflight offline que bloqueia a cadeia até
haver correção formal e evidência independente. As candidatas de substituição,
compatibilidade e linha reconstruída permanecem experimentais; a comparação,
os limites e o próximo gate estão em
[MIGRATION-CHAIN-REMEDIATION-ADR.md](MIGRATION-CHAIN-REMEDIATION-ADR.md).
As decisões `0019` e `0028` continuam `pending-human`.

## M42 — evidências externas das migrations — 14 de outubro de 2026 UTC

A PR #41 foi integrada em `961081432f7e4ade133822d7a33300a88eca8fbc`; a CI
pós-merge `38505897780` passou. Metadados sanitizados reconfirmaram dois
projetos e cinco branches Neon, todos com `neondb_owner` e endpoint `read_write`.
Nenhum SQL externo foi executado. O Worker `cacau-v1-hml` mantém deployment
`8268b409-34bc-4881-9694-52c292da2da3`, versão
`e241b715-99bf-4a83-82ba-eef24fedadaa`, a 100%; `DATABASE_URL` é `secret_text`
e seu destino permanece não comprovado. Backup, restore, journal, catálogo e
decisões `0019`/`0028` seguem `pending-human`; estratégia A permanece `LAB-ONLY`.
Detalhe: [M42-MIGRATION-EXTERNAL-EVIDENCE.md](M42-MIGRATION-EXTERNAL-EVIDENCE.md).

## M44 — preparação da auditoria read-only — 16 de outubro de 2026 UTC

`main` permanece em `6eed5053`; PR #42 integrada e CI pós-merge `38544956647`
verde foram reconfirmadas. O inventário MCP, sem SQL, encontrou as três
branches `steep-brook` agora `ready`, mas ainda apenas `neondb_owner`,
endpoints `read_write`, zero snapshots listados e histórico de seis horas. O
Worker `cacau-v1-hml` mantém deployment/versão 100% e `DATABASE_URL` como
`secret_text`, sem leitura do valor: Worker → Neon continua `unverified`.
O verificador fail-closed passou a recusar explicitamente `neondb_owner`.
Passaram a suíte local (453 testes), laboratório PostgreSQL 17 e ambos os
builds isolados com chave pública sintética.
PR #43 está em rascunho; as CIs `38882993996` e `38882993832` passaram no SHA
`ebdd1e4`.
Nenhuma migration, segredo, SQL externo, deploy, backup ou restore ocorreu.
Estado: `VALIDATION-BLOCKED-NO-READONLY-AUDIT`; ver
[M44-READONLY-AUDIT-READINESS.md](M44-READONLY-AUDIT-READINESS.md).

## M45 — integração e gates externos — 16 de outubro de 2026 UTC

A PR #43 foi integrada por merge commit `32a9e119` após revisão do SHA
`3e19a24`; as CIs da PR e a pós-merge `38922738966` passaram. A M45 reforçou
somente controles locais: saída sanitizada do atestador agora inclui versão e
UTC, e a role temporária/revogação foi provada exclusivamente em PostgreSQL 17
descartável. O inventário MCP não autoriza SQL: MCP administrativo, banco
identificado e branch `ready` não provam HML, Worker → Neon ou auditoria
read-only. Snapshots continuam zero e retenção de seis horas não é backup.
`0017–0028`, backup/restore e decisões `0019`/`0028` continuam bloqueados por
evidência/decisão humana. Ver [M45-EXTERNAL-AUDIT-GATES.md](M45-EXTERNAL-AUDIT-GATES.md).
A PR #44 permanece em rascunho; no SHA `395ebd6`, as CIs `38983532128`,
`38983546680` e `38983546701` passaram, sem autorização de merge.
