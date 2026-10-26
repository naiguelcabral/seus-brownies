# Handoff de autonomia — Cacau v1

## Ajuste do login na PR #75 — 26/10/2026

Na mesma branch de trabalho, usuário pediu separar “Esqueci a senha” de
“Primeiro acesso”, um por linha. `src/routes/login.tsx` ajustado, incluindo
orientação e verificação OTP; seletores dos dois ensaios existentes atualizados.
Mesmo fluxo de recuperação/definição de senha; sem nova permissão ou escrita
compartilhada. Typecheck, lint e formato aprovados.

Próximo passo: validar no laboratório isolado os botões e o build, atualizar
a descrição da PR #75 com o escopo final. S02/A04 permanece com a decisão
registrada abaixo e implementação pendente. Nenhum merge/deploy autorizado
por este pedido visual.

## Decisão S02/A04 registrada — 26/10/2026

Base `9426316` (PR #74 integrada). Branch de trabalho
`codex/validated-user-approval-policy-20261026`, na worktree
`/tmp/cacau-auth-hardening-20261025`; pasta principal preservada. Registro
somente documental da decisão de Dono com todas as permissões e Gerente com
aprovação de cadastros validados. Matriz, segurança, regras, aprovação humana,
roadmap e status reconciliados; RBAC executável e contas preservados.

Verificação documental: sete arquivos revisados, 127 links locais válidos e
`git diff --check` aprovado. Suíte, lint e build não repetidos: não houve
alteração de código, contrato executável, dependência ou configuração.

Próximo passo exato: implementar S02/A04 conforme a
[matriz](AUTHORIZATION-MATRIX.md), com permissão própria de aprovação,
validação confiável do destinatário, escopo inicial de Funcionário,
auditoria transacional e testes de negação/concorrência. Não repetir bootstrap
ou concessões históricas. A04/reset e prova HML continuam separados.
Este registro não conclui S02/A04 nem autoriza nova integração/publicação,
SQL compartilhado, migrations aplicadas, secrets ou concessões reais.

## Integração autorizada da PR #74 — 26/10/2026

Após a apresentação da PR #74 validada e da sequência restante, usuário
respondeu **“Pode seguir com a integração”**. Autoriza integrar somente esse
pacote concreto, preservando commits e proteção da main, após reconferir o
HEAD e todos os checks/resultados CodeQL. Não inclui deploy, SQL compartilhado,
secrets, DNS, concessões de acesso ou outras PRs.

O código revisado é b4ae5cb; a candidata documental 76fd7a5 teve todos os
12 checks aprovados e três análises CodeQL sem resultados/erros/avisos,
zero alertas abertos. Este fechamento altera só documentação/evidência.
A árvore de código/testes/configuração permanece a mesma. Resultado do merge,
SHA final e CI da main são conferidos no
[estado da PR #74](https://github.com/naiguelcabral/seus-brownies/pull/74).

A59 done identifica o pacote de código entregue e validado, não publicação
nem encerramento integral de A04/A07/A08. Restam autoria de concessões futuras/
bootstrap e conclusão de reset com identidade confiável, prova HML com serviços
reais/rede móvel, A01/A03 e decisões L02–L06. A configuração versionada não é
recibo de configuração remota aplicada. Registros de preparação abaixo são
históricos; sua restrição de merge antecede esta autorização específica.

## Continuidade local A59 — 26/10/2026

Código b4ae5cb, branch `codex/auth-hardening-next-20261025`, worktree
`/tmp/cacau-auth-hardening-20261025`. A PR #72 continua integrada em f2a7fc7;
nenhum novo merge/deploy/SQL compartilhado. Novo pacote local pronto para PR;
614 Node, typecheck/lint/formato/Knip, build isolado e 12 conectados aprovados,
incluindo timeouts/rollback e zero conexões remanescentes. Container encerrado.

Próximo passo: conferir CI/CodeQL do HEAD publicado e entregar a PR concreta.
Integração/publicação não devem ser inferidas de A59. Restam A04 concessões/
bootstrap e conclusão do reset com identidade confiável, prova HML A07/A08,
A01/A03 e decisões L02–L06. Detalhes em
[desenho e evidências](AUTH-CONNECTION-HARDENING-2026-10-26.md).

A pasta principal ficou limpa na branch codex/audit-remediation-20261023,
HEAD febef1d. Edições iniciais ficaram preservadas na worktree managed
`audit-review-20261025`; a candidata atual e seus commits são a fonte da
continuidade, pois a primeira pasta fora da área gravável exigia permissões
repetidas. Nenhum arquivo privado foi copiado para /tmp; só diff versionado,
os oito fontes/testes novos e link das dependências existentes.

Uso oficial no checkpoint: 99% restante, reserva 5%, reset exibido 26/10/2026 11:56:18 -03.
Janela renovada durante a continuidade; não houve pausa por reserva nem
execução automática de LIGARTUDO/DESLIGARTUDO nesta rodada.

## Integração da PR #72 autorizada — 25/10/2026

Após a entrega da PR #72 pronta para revisão, usuário respondeu “Pode seguir”.
Integrar somente essa PR por merge commit, após nova conferência do SHA e
gates; conferir também a main resultante. Código revisado cc44af7, base53d6379,
todos os checks aprovados e três análises CodeQL sem resultados/erros/avisos.
Este fechamento muda apenas documentação/evidência e precisa de novos checks.

Roadmap/status/espelho/aprovação reconciliados. A58 done identifica o pacote
de código entregue; A04/A07/A08 e os gates externos continuam no roadmap.
Resultado de merge e CI final na própria PR, sem autoatribuir o SHA futuro.
Preservar pasta principal e worktree própria; não repetir os cinco merges
anteriores. Sem deploy, SQL compartilhado, secrets, RBAC ou outras PRs.
O registro de preparação abaixo precede esta autorização.

## Pacote local de pré-publicação — 25/10/2026

Usuário pediu os ajustes pequenos anteriores à publicação em uma única PR.
Branch codex/prepublish-small-fixes-20261025 na worktree própria já anexada;
base main53d6379, pasta principal preservada. Código da candidata: limites,
autoria Auth parcial, timeout Turnstile, origens FIFO/CSV, headers, configuração
versionada, cobertura e regra de worktree para revisão. Sem mudança de versões,
schema, RBAC, custos ou histórico.

601 testes Node, build isolado e dois smokes públicos no código desta candidata;
12 conectados PostgreSQL17 e40 fixtures em4907b24. Depois, somente a guarda
de comprimento numérico e a restrição localhost da sonda mudaram; CI repete os
casos no SHA publicado. Lint/tipos/formato/Knip e audit0;
recibo evidence/prepublication-small-fixes-2026-10-25.json fixa a abrangência.
Cobertura Node explicita53 fontes não medidas; não extrapolar85,83% das linhas
medidas para o sistema inteiro. O build inicial apontou import server-only no
entry isomórfico; corrigido com imports nos callbacks de servidor, mantendo
proteção de importação. O contrato de idempotência mantém as três chaves e
agora lê também o módulo de schemas.

Próximo passo desta entrega: conferir diff/links/guards, publicar a branch,
abrir/anexar uma única PR e conferir CI/CodeQL do SHA final. Não integrar ou
publicar sem autorização aplicável. Depois, A04/A07/A08 restantes e decisões
de sustentação conforme roadmap. Nenhum teste/fato sintético no HML.

## Integração autorizada — 25/10/2026

Usuário autorizou explicitamente a sequência #61 → #63 → #62 → #64 → #65.
As quatro correções de código foram integradas após atualização da branch e
checks/CodeQL de cada novo SHA; esta entrega documental #65 fecha o registro.
Main do código operacional: 79634e6. Merges 1536920, f5f6f93, 6dd8655 e
79634e6. Recibo evidence/pr-sequential-integration-2026-10-25.json.

Worktree própria preservada em /home/naiguel/.codex/worktrees/audit-review-20261025/seus-brownies,
branch codex/integrate-pr65-20261025; pasta principal não foi trocada.
Árvore operacional idêntica a 0bfc9b8, antes validada com 586 testes Node,
40 fixtures, 12 conectados e dois ensaios PostgreSQL. Checks das candidatas
atualizadas passaram. Nova auditoria: zero vulnerabilidades. Zod 4.6.7 único,
Undici 7.30.1 e Drizzle Kit em desenvolvimento; lockfile preservado.

Roadmap/status/espelho e aprovação humana atualizados. Antes de encerrar,
confirmar merge da #65, CI/CodeQL da main final e equivalência operacional;
o SHA do próprio fechamento fica no estado da PR no GitHub. Não repetir
merges já confirmados. Nenhum deploy, SQL compartilhado, .env, segredo,
credencial histórica, mudança de papel ou nova automação nesta integração.

Próximo passo: preparar os incrementos locais restantes de A02/A04/A07,
respeitando o roadmap; publicação HML e comprovação por marcador dependem
de seu gate. Não confundir código integrado com HML publicado/aceito.
Outras PRs seguem revisão própria. Sem gatilho de reserva nesta rodada;
DESLIGARTUDO não é procedimento de trabalho normal.

Os checkpoints abaixo registram a preparação histórica: a autorização de
merge antes pendente foi recebida e aplicada nesta execução.

## Organização retomada — 25/10/2026

Uso oficial renovado em 100% nas duas janelas; LIGARTUDO --prepare-only e
fast-forward da branch limpa concluídos. Keyring do GitHub CLI não confirmado
pelo preflight; plugin GitHub e Git por origin funcionaram. Isso não constitui
validação de handshake de outro MCP. Sem leitura de credenciais privadas.

Pasta principal preservada em codex/audit-remediation-20261023/febef1d.
Worktree gerenciada de revisão: /home/naiguel/.codex/worktrees/audit-review-20261025/seus-brownies.
Branch do ensaio codex/review-audit-integration-20261025, HEAD 0bfc9b8;
branch documental codex/organization-followup-20261025 atualiza a PR #65.
PR #64 recebeu testes em 601f138 e seus novos checks passaram; três análises
CodeQL da referência de merge eb037429 sem resultados/erros/avisos e zero
alertas abertos. #65 mantém a fila canônica e os recibos.

Concluído: leitura dos diffs de #61–#65, checks dos SHAs iniciais aprovados,
composição local sem conflitos, instalação limpa audit zero, 586 testes Node,
40 de interface, 12 conectados, dois ensaios PostgreSQL, build isolado e
lint/tipos/formato/Knip aprovados. Smoke público passou após diagnóstico e
repetição serial; houve falha de clique em execução concorrente, sem causa
comprovada e sem asserções removidas. Quatro testes focados da regressão
final passaram. Containers desta execução encerrados. Detalhes por SHA em
../reviews/INTEGRATION-REVIEW-2026-10-25.md e evidence/pr-integration-review-2026-10-25.json.

Roadmap/status/espelho atualizados com etapas, responsáveis e critérios.
Relato de A01 foi preservado como parcial sem fingir nova coleta; role do
Worker requer confirmação; estatística de consulta não é trilha auditável.
Nenhum .env, credencial histórica ou secret lido, SQL externo, merge na main,
deploy, alteração de política/permissão ou automação realizado nesta rodada.

Próximo passo exato: obter autorização humana para #61 → #63 → #62 → #64 →
#65, reler main/SHA/diff/checks entre merges e tratar conflitos sem descartar
provas. Conferir lockfile e Drizzle Kit em devDependencies na composição final.
Publicação HML exige seu gate e recibo; confirmar redação por marcador
sintético. Não promover produção. Enquanto aguarda, frentes locais da etapa
2 podem ser preparadas em PRs pequenas, sem aguardar autorização externa
desnecessária. A02/A05 já preparados; limites de payload e aceite real pendentes.

Uso oficial no checkpoint: 79% restante na janela de cinco horas e 97%
semanal; não é fechamento por reserva.

Estado: organização e revisão entregues; aguardando gate de integração.
Sem pausa por reserva e sem nova retomada agendada. Não executar DESLIGARTUDO
em trabalho normal. A referência de 5% abaixo é histórica e foi superada
pela renovação confirmada de 25/10.

## Remediação da revisão — fechamento por reserva em 23/10/2026

Tarefa: organizar as próximas etapas com base na última revisão/auditoria e
seguir dentro dos gates. Branch: codex/audit-remediation-20261023; base local
74802578d37f39ad458dd8c61df3acf31b6b67a2, merge de origin/main bb122d8 sobre
3af1af5. Os recibos 7eb15f2/3af1af5 foram preservados; nenhuma integração
remota foi executada. A pasta docs/reviews/ já existia sem rastreamento no
início e contém o relatório/inventário usados como fonte, preservados sem edição.

Concluído nesta rodada: governança lida; Git/branch conferidos; GitHub plugin
reconferiu #55/#59/#60 integradas e #61–#63 abertas. Roadmap recebeu A01–A12,
critérios, ordem e gates; status e espelho reconciliados. Leitura do lockfile
confirmou Zod 4.5.4 na raiz, 4.1.12 no SDK Neon e 4.6.7 no Knip. Advisory
GHSA-mrhx-c7xc-m3w5 reconferido: corrigido a partir de 4.6.6. Dependências não
foram alteradas. Não há nova prova de revogação histórica, rotina de backup,
publicação de #60 ou homologação real; não marcar esses itens concluídos.

Arquivos desta rodada: ROADMAP-CODEX.md, PROJECT-STATUS.md,
AUTONOMY-QUEUE.md e este AUTONOMY-HANDOFF.md; relatório/inventário em
docs/reviews/ preservados para versionamento junto ao checkpoint. Validação:
oito links locais sem ausências, JSON do inventário válido e git diff --check
aprovados antes do salvamento. Testes, lint,
tipos, audit e build não repetidos, pois a alteração própria é documental.
As suítes históricas de 574/16 testes pertencem à revisão, não a este merge.

Próximo passo exato, após renovação confirmada: consultar uso, executar
./LIGARTUDO conforme política, confirmar esta branch e status; atualizar por
fast-forward apenas se limpo e com upstream existente. Reler roadmap/handoff
e preparar A02: corrigir o grafo Zod com mudança compatível mínima, incluindo
a cópia fixada do Neon; adicionar regressão de todas as cópias e verificar
com npm ci, npm audit, Auth/contratos, suíte, lint/tipos/check/Knip e build
isolado do HEAD versionado. Definir/testar limites de corpo/cardinalidade como
parte separável de A02, sem declarar o achado encerrado só pela versão.
Em paralelo lógico, A01 exige evidência sanitizada do responsável; nunca ler
ou testar a credencial histórica. Não iniciar agentes paralelos.

Pendências/gates: merge humano de candidatas revisadas e checks do SHA atual;
rotação/secrets/configuração/SQL compartilhado/produção exigem autorização
específica. Preparar A05, revisar #61 e #63, depois #62 atualizada sobre #63;
seguir demais etapas do roadmap. Nenhum novo deploy ou dado sintético no HML.

Uso oficial no fechamento: 95% consumido / **5% restante** na janela de cinco
horas; semanal 85% restante. Reset: **24/10/2026 01:18:27 America/Sao_Paulo**
(2026-10-24 04:18:27 UTC, epoch 1792815507). Estado: encerrando por reserva.
Não iniciar implementação adicional. ./DESLIGARTUDO deve executar após este
handoff, fora da main; verificar commit/push e registrar eventual falha.
Não há retomada desta tarefa agendada por esta rodada.

## Validação automática autorizada — 21/10/2026

Branch codex/automatic-readiness-20261021; incremento 2bcb597: patch isolado
launch-editor 2.14.2, regressão de segurança e teclado móvel 320px. npm ci e
audit zero vulnerabilidades; 560 testes, lint/tipos/formato/Knip e build HML
isolado aprovados. Navegador isolado: 40 casos aprovados. Restrições EPERM do
sandbox foram resolvidas repetindo a suíte no host, sem enfraquecer testes.

Restore dos bytes baixados do Drive aprovado: 38 tabelas/36 recibos exatos,
catálogo independente e constraints; sem alteração da origem. Dump privado
fora do Git, Auth excluído. Proposta G03 e procedimento T02 preparados.
Fila antiga substituída por espelho do roadmap, sem pacotes ready.

PR51 em rascunho; CI/negócio/browser/CodeQL de bf1c25c aprovados, três análises
sem resultados/erros/avisos. Container do restore encerrado/removido; arquivos
privados e evidências preservados. Próximos gates humanos:
autenticação real, perfis/celular, recuperação/retenção/RPO/RTO/Auth, proteção
administrativa, plano específico de migrations, piloto e produção. Não repetir
restore, importações ou publicações antigas por instruções históricas abaixo.
Detalhes em [evidência da rodada](AUTOMATIC-READINESS-2026-10-21.md).

## Investigação encerrada e correção publicada — 20/10/2026

- Retomada com capacidade oficial renovada em 100%; `LIGARTUDO --prepare-only`
  e fast-forward da branch limpa concluídos. Código `3f0ba59` sincronizado na
  branch `codex/integrated-validation-gates`, PRs #47/#48 em rascunho, sem merge.
- 500 preexistente confirmado na versão antiga; consulta anônima desnecessária
  reproduziu o mesmo HTTP com 429/503 em workerd local. Causa upstream dos
  eventos históricos não confirmada; não atribuir ao Neon ou à última alteração.
- Alterados adaptador TanStack Neon, resolver, logger de sessão e cinco testes;
  governança/recibo em `HML-SESSION-INCIDENT-2026-10-20.md` e
  `evidence/hml-session-incident-2026-10-20.json`.
- 556 testes Node, 16 casos runtime, smoke de navegador, lint/tipos/formato/Knip
  e build HML isolado passaram. CI 39458289653, negócio/browser 39458289627,
  migrations 39458297440, evidência 39458297385 e CodeQL 39458289645 passaram;
  três análises sem resultados e zero alertas. Servidores locais encerrados.
- HML: versão `e2aba61f-ca72-4459-a0d7-95867cdb2e67`, deployment
  `846b959a-1c69-4508-83bd-c823a6d8ce3a`, 100%, às 16:34:55 UTC. Probe 307/200,
  oito GETs/tail normais e readback de 14 eventos da versão nova sem 500.
- Sem escrita de fatos, migrations, secrets ou Worker principal. Não repetir
  backup, importações ou rollback anterior. Não há monitoramento recorrente.
- Próximo passo no roadmap: aceite conectado com contas teste/Gerente que o
  usuário criará e implementação dos alertas ao Dono. Sessão autenticada não
  foi comprovada por esse smoke. Integração à main exige revisão humana própria.
- Capacidade oficial consultada durante a tarefa: 82% restante na janela de
  cinco horas, 82% semanal; reset exibido: 20/10/2026 18:19:38 America/Sao_Paulo. Tarefa encerrada normalmente,
  sem gatilho de reserva e sem execução automática de `DESLIGARTUDO`.


## Checkpoint de encerramento — 20/10/2026

Código `6acb11a`: 551 testes Node, 35 casos de navegador isolado, dois runners
PostgreSQL e CI/CodeQL aprovados no SHA exato. CI39435180771,
negócio/browser39435180794, migrations39435180012, evidência39435179660 e
CodeQL39435179809; zero alertas abertos e zero avisos de runtime na CI.

Backup explicitamente autorizado da original `production`, somente leitura
(public/drizzle), salvo privado em `backups-local/` fora do Git. Restore local
conferiu 38 tabelas, 36 recibos e catálogo exato. Auth gerenciado excluído;
sem cópia externa ou periodicidade. Todos os containers desta tarefa encerrados.

A publicação HML do incremento retornou 500 nas rotas públicas. Foi revertida
para `f0c2e0e2-8798-4132-9abc-50c87bf7a973` (código `d5cc034`), 100% do tráfego,
deployment `0698a29c-6021-4f98-a627-2a68025a7185`, às 14:06:44 UTC. A primeira
checagem após rollback ainda falhou; após propagação, GETs completos conferiram
raiz307 e login200. A causa permanece sem diagnóstico; não considerar o
incremento publicado estável nem repetir deploy sem investigação. Produção
principal, secrets, migrations e dados históricos não foram alterados.

Próxima prioridade: investigar logs sanitizados do erro no HML e validar runtime
antes de nova publicação. Depois, contas teste/Gerente que o usuário criará,
aceite conectado e alertas automáticos no perfil Dono (ainda não implementados).
PRs47/48 em rascunho; nenhuma integrada à main. Recibo:
`evidence/integrated-validation-2026-10-20.json`.

Uso oficial: 4% restante na janela de cinco horas (96% consumido), reserva
atingida; semanal85% restante. Reset exibido: 20/10/2026 12:52:05
America/Sao_Paulo (1792511525). Estado: encerrando por reserva de capacidade.
Branch `codex/integrated-validation-gates`, nunca main. Arquivos principais:
functions de operações/produção, runners/workflow isolados, fixtures browser,
backup/probe, ferramentas e governança. Detalhes no recibo e PRs47/48.
Verificações pendentes: diagnóstico do 500, aceite autenticado e publicação
estável; não repetir backup, importações ou operações históricas.

Retomar somente após reset e confirmação da renovação, executar `./LIGARTUDO`,
conferir Git e reler governança. Próximo passo exato: consultar deployment ativo,
GET público e logs sanitizados do intervalo 14:01–14:08 UTC de20/10; distinguir
falha transitória de serviço e regressão antes de publicar. Sem iniciar novo
escopo na reserva. `./DESLIGARTUDO` será executado após este handoff.


## T02 — revisão offline oficial — 20 de outubro de 2026

- Continuação “Pode continuar”: preparação e revisão local adotadas, sem
  aplicação compartilhada, merge ou publicação. Branch e PR #46 mantidas.
- `db:prepare` gera pacote temporário; `db:review` valida metadados sanitizados
  com catálogo completo, recibos exatos, coleta independente recente e gates
  aplicáveis. Execução e autorização sempre falsas; `db:migrate` inalterado.
- Oito referências de catálogo reproduzidas e rejeição de drift ensaiadas no
  PostgreSQL 17 isolado. Treze casos forward passaram novamente.
- 546 testes Node, lint, tipos, formato e Knip aprovados; zero novas
  ocorrências. Container sintético encerrado. Recibo:
  `evidence/migration-chain-readiness-2026-10-20.json`.
- Código final `4d3821a` sincronizado. CI39418068183, PG39418068187 e
  CodeQL39418061713 aprovados; 48 casos PostgreSQL remotos, três análises com
  zero resultados e alerta #10 corrigido. Build HML isolado aprovado em
  45799a8; a correção posterior toca apenas leitura da CLI offline e também
  passou o build da CI. Árvore limpa após o checkpoint documental.
- Próximo passo: completar a classificação independente dos alvos relevantes,
  confrontar catálogo/journal real com a linha ensaiada e registrar plano e
  autorização específicos antes de qualquer SQL compartilhado. Não presumir
  que a branch original seja HML ou reutilizar decisões de outro alvo.
- Nenhuma alteração em `src/`, migrations ou referências consumidas. Nenhum
  fato fictício, SQL externo ou deploy nesta etapa. T02 permanece parcial.

## T02 retomado e comprovado em laboratório — 20 de outubro de 2026

- Capacidade oficial renovada: 100% nas duas janelas na retomada; a reserva
  anterior está encerrada. `LIGARTUDO --codex` validou dependências/MCPs/keyring;
  somente a abertura de outra TUI parou por falta de terminal interativo.
- Branch `codex/generic-migration-path`, código `c6d0bf8`, PR #46 em rascunho,
  base na branch publicada `feat/input-catalog-kg-purchases` para limitar o diff.
- Candidata offline conserva SQLs/hashes/timestamps e pontes, inclui até 0033,
  classifica prefixos exatos e valida geração futura. Nenhuma cadeia ativa
  alterada, nenhum deploy, SQL externo ou operação fictícia compartilhada.
- Passaram 538 testes Node, 48 casos PostgreSQL 17 (13 novos), lint, tipos,
  formato, Knip e build HML isolado. CI39412305542, PG39412305442 e
  CodeQL39412305514 verdes em c6d0bf8; três análises sem resultados e nenhum
  alerta aberto. Container de teste encerrado.
- Próximo passo exato: revisar a adoção da linha e seus metadados conforme a
  revisão de20/10 do `MIGRATION-CHAIN-REMEDIATION-ADR.md`; T02 permanece parcial.
  A candidata não é autorização de aplicação. Manter `db:migrate` bloqueante,
  não modificar SQLs/recibos antigos nem reaplicar cargas/referências do HML.
  Aplicação compartilhada continua exigindo classificação independente do
  alvo, recuperação e autorização específica. Sem merge automático.

## Reserva de capacidade após S01 — 19 de outubro de 2026

- Tarefa concluída: S01, inventário e fechamento das lacunas de autoria e
  auditoria operacional em todas as mutações.
- Branch: `feat/input-catalog-kg-purchases`; entrega `d5cc034` já sincronizada
  no remoto. Catálogo (seis mutações) e produção (criação/conclusão) agora
  gravam ator e evento na mesma transação. Demais domínios foram inventariados
  e já possuíam auditoria operacional ou histórico versionado.
- Arquivos principais: `src/features/catalog/functions.ts`,
  `src/features/production/functions.ts`, testes de produção,
  `test/operational-mutation-audit-contract.test.ts`, roadmap e estado
  canônico. Scripts de ensaio descartável receberam o ator explícito exigido.
- Verificações concluídas: 536 testes, lint, typecheck, formato, Knip, build
  principal e build HML isolado. Rollback por falha da auditoria foi ensaiado.
- HML: commit `d5cc034`, versão
  `f0c2e0e2-8798-4132-9abc-50c87bf7a973`, 100% do tráfego. Após falha
  transitória da primeira leitura de sessão, catálogo autenticado carregou 38
  produtos e o Worker registrou as requisições como `Ok`. Nenhuma mutação ou
  dado sintético foi criado; nenhuma migration foi necessária.
- Verificações pendentes desta entrega: nenhuma. A CI remota do commit pode ser
  consultada na retomada, sem repetir deploy ou teste compartilhado.
- Próximo passo exato: retomar somente após renovar a franquia, executar
  `./LIGARTUDO`, confirmar branch/árvore/remote e então iniciar T02/#36 pela
  revalidação dos documentos e experimentos da cadeia genérica de migrations.
  Não aplicar migrations, usar `db:push`, ler secrets ou consultar/escrever
  banco compartilhado sem os gates e aprovações específicos já documentados.
- Riscos/gates: T02 continua condicionado à estratégia genérica, instalação
  nova, preservação, evidência externa não gravável e decisões humanas da
  cadeia. Produção principal segue fora do escopo.
- Uso Codex: 5% semanal restante; reserva do projeto atingida. Reset exibido:
  24/10/2026 às 20:43:53, horário de Brasília. Estado: pausado por reserva.

## M44 — preparação segura da auditoria read-only — 16 de outubro de 2026 UTC

- Branch: `codex/m44-readonly-audit-readiness`, iniciada de `origin/main`
  `6eed5053dc9ae3f4d156440551f64c3acdb6b25e`; worktree inicial limpo.
- GitHub MCP confirmou PR #42 integrada nesse SHA e CI pós-merge
  `38544956647` `completed/success`. Não havia PR M43/M44 pendente na busca.
- Neon MCP administrativo foi usado somente para metadados: dois projetos
  PostgreSQL 17, cinco branches `neondb`/`neondb_owner`, endpoints
  `read_write`, zero snapshots e retenção de 21.600 s. `steep-brook` mudou
  para `ready`; isso não comprova ambiente. Nenhum SQL externo foi executado.
- GETs sanitizados do Cloudflare confirmaram Worker, deployment, versão, 100%
  e binding `DATABASE_URL: secret_text`; o valor do secret não foi lido e o
  destino continua `unverified`.
- O verificador local agora recusa `neondb_owner` mesmo se apresentado como
  role aprovada. Passaram: 12 testes direcionados, suíte com 453 testes,
  lint, typecheck, 18 casos PostgreSQL 17 de cadeia, prova de role/read-only
  em PostgreSQL 17 descartável e ambos os builds isolados com chave pública
  sintética. As fixtures foram removidas. Não executar `db:migrate`, SQL Neon,
  deploy ou o sanitizador com dado real.
- PR #43 permanece draft; no SHA `ebdd1e4`, CI `38882993996` e workflow
  PostgreSQL 17 `38882993832` concluíram `success`. O próximo checkpoint é
  somente documental; não fazer merge.
- Gate humano: credencial de auditoria transitória estritamente não gravável,
  atestação privada Worker→banco, backup/restore e escolhas 0019/0028. Estado
  `VALIDATION-BLOCKED-NO-READONLY-AUDIT`.

## Remediação da cadeia 0017–0028 — 14 de outubro de 2026 UTC

- Worktree/branch: `codex/migration-chain-remediation`, baseado em `main`
  `7460420528f5a4512b824c09eb08df39a647a77b`; árvore inicial limpa.
- PostgreSQL 17 descartável reproduziu `0017` com SQLSTATE `42703`: baseline
  `0016` possui `products.measurement_unit`, não `products.unit`. Journal e
  catálogo foram revertidos; 18 cenários sintéticos passaram, incluindo
  `0028` com e sem linhas de mix e rollback injetado.
- `npm run db:migrate` agora executa somente o preflight offline fail-closed.
  Não chama Drizzle, dotenv nem rede; rejeita DSN em argumentos/evidência e
  bloqueia defeito ativo, parcial, hashes, destino, produção, backup e decisões.
- As três candidatas continuam temporárias e experimentais. Não alterar
  `drizzle/`, journal ou snapshots para ativá-las. Referência:
  `MIGRATION-CHAIN-REMEDIATION-ADR.md`.
- Metadados Neon e Worker somente leitura foram reconfirmados. Não houve SQL
  externo porque as cinco branches só expõem endpoint `read_write` e papel
  administrativo; secret `DATABASE_URL` não foi lido.
- Próximo passo exato: revisar a PR em rascunho e, fora desta tarefa, coletar
  atestação privada com papel não gravável e os aceites `0019`/`0028`. Não
  executar `db:migrate` contra qualquer destino compartilhado.

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

## Missão G3 — sincronização supervisionada, 13 de outubro de 2026

- Branch `codex/g3-supervised-project-sync`, base main `1e5bd557` conferida.
- Motor e runbook em `scripts/project-sync/` e `PROJECT-SYNC.md`; nenhuma nova
  dependência/autenticação. Perfil real somente em `.codex-local/project-sync/`.
- Criação técnica real com readback e repetição recuperada sem nova página;
  leitura completa e dashboard verificados. Cota SQL terminou; views default
  existentes sem filtro foram conferidas e funcionam com paginação por cursor.
- Falha na primeira tentativa de append; adapter agora usa UUID e a intenção antiga
  preservada como inconclusiva, sem retry cego. Nova operação distinta validada.
- 33 testes locais do motor passam. Suíte geral: 430, incluindo wrapper dos
  contratos. Lint/tipos/formatação dos alterados e build isolado aprovados.
- PR #40 em draft, CI `38393316644` aprovada em `2ffa130`. Commits de entrega:
  `74c4296` (motor/testes/runbook) e `2ffa130` (governança). Registro posterior
  apenas documental; confirmar a CI no HEAD atual antes de integrar.
- Próximo passo: revisão humana da PR; uso supervisionado conforme o runbook,
  com novo plano/digest e sem adoção automática de registros manuais. Sem merge.
  Revalidar Git/Notion; não reaplicar criação nem limpar checkpoints privados.
- Uso Codex: não disponível nesta execução; nenhum percentual estimado.

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

Próximo comando seguro: `gh pr view 38 --repo naiguelcabral/seus-brownies --json state,isDraft,headRefOid,statusCheckRollup`.
Após revalidar o SHA, conferir os três itens do operador documentados na
evidência compartilhada. Sem esses itens, não iniciar coleta SQL nem substituir
a cadeia ativa. Os testes descartáveis continuam no workflow existente,
com PostgreSQL 17 e dados sintéticos; nunca redirecioná-los para Neon.

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
- Validação local: 441 testes, incluindo 12 direcionados, lint, typecheck,
  Prettier dos arquivos alterados, sintaxe Node e diff sem whitespace passaram.
  Os dois builds isolados passaram com chave pública Turnstile sintética.
  Fixture PostgreSQL 17 local em loopback passou e foi descartada; CIs finais
  são acompanhadas na PR #39, sem tratar fixture como evidência externa.
- Próximo passo exato: operador preenche
  [HML-DATABASE-OPERATOR-ATTESTATION.md](HML-DATABASE-OPERATOR-ATTESTATION.md),
  fornece acesso privado já aprovado e referência independente de catálogo;
  Dono preenche os dois formulários de decisão. Não inferir fechamento de gate.

## Revisão #35 e tarefa corretiva #36 — 9 de outubro de 2026

- O Dono autorizou revisar/integrar somente a preparação e confirmar CI da
  `main`; não autorizou aplicar `0017`–`0028` em HML.
- Correções: SHA/ID exatos e metadados da CI pós-merge, definições de snapshot,
  enums, testes negativos para drift com nomes iguais e erros de subprocesso.
  Verificador continua offline, sem atestação externa ou aprovação de aplicação.
- Tarefa própria: [#36](https://github.com/naiguelcabral/seus-brownies/issues/36),
  plano `MIGRATION-CHAIN-REPAIR-0016.md`. Nenhuma estratégia aprovada; preferência
  inicial condicionada ao inventário completo de bases compartilhadas.
- PR #35 integrada pelo merge `a542ec73d914bcca12090b38df69bf16a49e9bbf`.
  CI pós-merge da `main`: [37944260848](https://github.com/naiguelcabral/seus-brownies/actions/runs/37944260848),
  `push`, mesmo SHA, `completed/success`.
- Próximo passo: comparar/provar estratégias na issue #36, em tarefa/branch e
  PR corretivas separadas, começando pelo inventário das bases compartilhadas.
- Não presumir associação Worker/banco, ausência global de `0017+`, aprovação
  financeira `0019` ou dados de cenários `0028`.
- Uso Codex: não disponível para esta execução. Nenhum percentual estimado.
- Validação desta revisão: lint direcionado, typecheck e formatação passaram.
  Cinco casos funcionais passaram em diagnóstico no mesmo processo. A suíte
  CLI local foi bloqueada por `spawnSync EPERM` do ambiente e não é registrada
  como aprovada; testes agora rejeitam erro de subprocesso explicitamente.
  A CI remota completa passou no commit final `10e62c26`: 429 testes,
  lint, typecheck e build isolado; runs PR `37943877875` e push `37943868409`.

## Readiness HML 0017–0028 — 9 de outubro de 2026

- Base `origin/main` `100d41c`; PR #34 integrada e CI pós-merge
  `37930101604` verde. Worktree/branch `codex/hml-migration-readiness`.
- Objetivo: preparar revisão, verificação read-only, teste descartável,
  pre/pós-checks e recuperação. Não objetivos: aplicar HML/produção,
  alterar migration histórica, deploy ou dado compartilhado.
- Arquivos: `HML-MIGRATION-READINESS-0017-0028.md`,
  `scripts/hml-migration-readiness.mjs`, teste correspondente e estes
  registros canônicos.
- PostgreSQL 17 local sem rede: `0000`–`0016` aplicadas com hashes
  corretos; `0017` falhou por coluna `products.unit` inexistente.
  Drizzle reverteu `0017`–`0028`. Cópia diagnóstica temporária da
  `0017` permitiu testar sequência e reaplicação, sem alterar Git.
- Metadados Neon confirmaram projeto/branch/database documentados, mas SQL
  HML foi bloqueado porque a conexão MCP tem permissão `ADMIN` e não
  comprova read-only. Hashes, estado e drift HML atuais não confirmados.
- Aceite do pacote: script/teste verde, suíte/lint/tipos/builds isolados,
  diff revisado, PR draft. Próximo passo após PR: decisão humana para ponte
  auditável anterior à `0017`, role estritamente read-only, associação
  Worker/banco, valores `0019`, backup/janela/RPO/RTO; só então preparar
  autorização específica de aplicação.

## Pós-integração consolidada — 8 de outubro de 2026

- Branch: `codex/integration-platform-governance`, baseada na `main`
  `2f7d19bb00ca3effc628a2972271872c802a8862`, que já inclui #31 e #32.
- Merge commits locais: #14, #21, #22, #23, #25, #28 e #29. Conflitos foram
  documentais; a governança mais recente da `main` foi preservada e os módulos
  de telemetria, memória, continuidade, sinais e smoke permaneceram intactos.
- PR #33 foi integrada e sua CI `37834057113` passou. Inventário atual:
  `POST-INTEGRATION-RECONCILIATION-2026-10-08.md`.
- PR #13 segue excluída e não é ancestral deste lote.
- Reconciliação documental pós-integração: PR #34 em rascunho, branch
  `codex/post-integration-reconciliation`, registra a matriz #4/#5/#13–#33,
  migrations e gates. A CI `37840299625` passou no SHA `b7d4d3c`.

## Checkpoint de integração — produção e readiness, 8 de outubro de 2026

- Branch: `codex/integration-production-readiness`, baseada em
  `origin/main` `f61e9a28df7b0fdbc80864402b578a2a0aabd3f8`.
- Merge commits locais concluídos: PRs #19, #20, #24, #26 e #27. Conflitos
  compostos apenas em documentação e imports da rota; guards e writers foram
  preservados.
- Evidência atual: `npm ci --ignore-scripts`, 16 testes direcionados, suíte
  de 387 testes, lint, typecheck, Prettier e `git diff --check` passaram. A
  primeira tentativa paralela dos testes falhou antes dos casos com `ETXTBSY`
  do esbuild logo após a instalação; a repetição serial dos mesmos testes
  passou, sem alteração de código.
- A CI da PR #31 foi revalidada por GitHub MCP: CI `37804204150` é `success`
  no SHA `1733573`.
- `build:ci-isolated` e build HML isolado passaram no HEAD limpo com a chave
  pública sintética; não houve leitura de `.env` ou deploy.
- Próxima ação exata: revisar, publicar somente esta branch e abrir PR em
  rascunho; consultar a CI dela.

## Missão autônoma — A25, 8 de outubro de 2026

- Testes locais de invariantes da conclusão transacional de produção foram
  adicionados com mock de Drizzle, preservando guards, rollback e precisão.
- Não houve mudança de regra de estoque/custo, migration, escrita HML ou
  alteração de RBAC.

## Missão autônoma — A24, 8 de outubro de 2026

- Reconciliação somente leitura compara custo físico ponderado e custo final
  FIFO por lote, preservando centavos em inteiros e explicitando lacunas.
- Não altera writer, custo, FIFO, estoque, migration, dados ou HML; qualquer
  divergência segue como diagnóstico para revisão humana.

## Missão autônoma — A22, 8 de outubro de 2026

- Objetivo: checklist revisável para preparar a operação real de produção.
- Não objetivos: autorizar operação/deploy, aplicar schema, ensaiar HML,
  definir RPO/RTO, corrigir histórico ou alterar regra financeira.
- Branch independente `codex/auto-a22-production-readiness`, main `f61e9a28`.
- Aceite: separar evidência local de homologação; cada etapa exige responsável,
  referência sanitizada e estado; gates mantidos e regras canônicas citadas.
- Resultado: checklist revisado contra regras e resiliência; links relativos
  existentes, Prettier/diff/guard verdes. Aplicação de schema/aceite físico
  continuam humanos.

## Missão autônoma — A18, 8 de outubro de 2026

- Objetivo: prévia acessível com quantidade faltante exata por insumo.
- Não objetivos: compra automática, bloqueio novo de rascunho, mudança da
  conclusão transacional, regra de estoque ou escrita em HML.
- Branch independente: `codex/auto-a18-ingredient-shortfalls`, main `f61e9a28`.
- Arquivos previstos: cálculo puro, teste, UI produção, roadmap, handoff e log.
- Aceite: saldo igual ao requerido não gera falta; saldos negativos aumentam
  déficit; unidades diferentes permanecem separadas; nenhum Number na conta.
- Testes previstos: saldo exato, negativo, grande, inválido e vazio; suíte,
  lint, typecheck, build CI isolado, Prettier, diff e guard sensível.
- Resultado: 2 casos direcionados e 373 testes da suíte, lint/typecheck,
  Prettier, diff e guard passaram. Build CI isolado passou com chave pública sintética explícita.

## Missão autônoma — A17, 8 de outubro de 2026

- Objetivo: tornar explícitos planejado, realizado, diferença física e custo
  alocado por saída na auditoria de cada lote.
- Não objetivos: percentual de eficiência, inferência de perda, novo custo,
  alteração de writer, migration ou homologação HML.
- Branch: `codex/auto-a17-batch-yield`, independente da main `f61e9a28`.
- Arquivos previstos: módulo puro de rendimento, teste, tela de produção,
  roadmap, status, handoff e log.
- Aceite: quantidade ausente não vira zero/planejado; diferença exata em
  milésimos somente com ambos os fatos; custo alocado exibido sem recalcular.
- Testes: módulo com lacunas, zero e quantidade grande; suíte, lint, tipos,
  build CI isolado, Prettier direcionado, diff e guard sensível.

- Resultado: 3 casos direcionados e suíte de 374 testes passaram; lint,
  tipos, Prettier, diff e guard verdes. Build CI isolado passou com chave pública sintética explícita.

## Integração controlada da PR #12 — concluída, 7 de outubro de 2026

- Objetivo concluído: reconciliar metas e cenários em
  `codex/wp-d-main-reconciliation`, validar, retirar o rascunho e integrar a
  PR #12 por merge commit, sem aplicar migrations, escrever em banco, fazer
  deploy ou tocar em `.env`, secrets, Cloudflare ou Neon.
- Base confirmada: `origin/main`
  `51f9657938d2b168c963341c6246a625514dd8a8`; origem congelada:
  `origin/codex/wp-d-scenarios`
  `c54f65bfa49607793b4d5e5eec7369585e42c6d3`. A árvore principal do usuário
  permanece suja e atrasada, por isso não foi alterada; o trabalho ocorre em
  worktree limpo.
- A origem foi incorporada sem rebase pelo merge commit `f155b94`. Houve
  conflitos apenas em `PROJECT-STATUS.md`, `AUTONOMY-HANDOFF.md` e
  `AUTONOMY-QUEUE.md`; a versão da `main` foi escolhida como autoridade e os
  fatos WP-D serão reaplicados somente após revisão. Código, schema, CI,
  controles de ambiente e migrations não conflitaram.
- Escopo validado: cenários versionados e auditados, mix com
  peso original e normalização exata de 103% para 100%, projeções separadas de
  realizados, RBAC server-side, ativo único, revisão otimista e migrations
  aditivas `0027`/`0028` apenas versionadas. `npm ci --ignore-scripts`, 371
  testes, lint, typecheck, Prettier dos arquivos suportados, `git diff --check`
  e os builds isolados de CI/HML com chave pública sintética passaram. SQL não
  tem parser Prettier e snapshots Drizzle são gerados; ambos ficaram fora apenas
  dessa checagem de formato. O aviso SSR de secrets ausentes era esperado na
  prova isolada e nenhum `.env` foi carregado.
- A PR #12 foi integrada pelo merge commit
  `4590ca4e235f540d6552ab499e1140434355ce1f`; a CI pós-merge da `main`
  (`37671827440`) aprovou `npm ci`, testes, lint, typecheck e
  `build:ci-isolated`. A branch de origem foi preservada.
- Gates externos remanescentes: autorizar aplicação de `0027`/`0028` somente
  em HML controlada, com backup, janela e rollback; depois homologar por
  navegador Dono, Gerente, Funcionário e negações por papel. PR #5 permanece
  congelada e não deve ser retargetada, fechada ou alterada.

## Integração controlada PR #11 — concluída, 6 de outubro de 2026

- A `main` de partida é `968e9a93fe0c67611c8afcd47eb419203bccdcd8`, após as
  integrações #9 e #10, ambas com CI pós-merge verde. A PR #11 estava aberta,
  em rascunho e conflitante contra essa base; PRs #4 e #5 foram somente
  confirmadas como abertas e permanecem preservadas, sem alteração.
- A branch `codex/workbook-parity-main-reconciliation` foi atualizada sem
  rebase pelo merge commit `38532d0`. Os únicos conflitos foram
  `PROJECT-STATUS.md`, `AUTONOMY-HANDOFF.md` e `AUTONOMY-QUEUE.md`; a versão da
  `main` foi mantida como autoridade. Não houve conflito nem modificação de
  código de produção, CI, controles de ambiente ou migrations durante a
  reconciliação.
- `npm ci --ignore-scripts` concluiu sem alterar o lockfile; o resumo do
  registry reportou 22 vulnerabilidades (3 críticas, 8 altas e 11 moderadas),
  registradas como dívida externa, sem atualização automática. No HEAD final,
  `npm test` passou com 349 testes; lint, typecheck, Prettier dos arquivos
  suportados e `git diff --check` passaram; `build:ci-isolated` e `build:hml`
  passaram com chave pública sintética. SQL não tem parser Prettier e snapshots
  Drizzle são gerados; ambos ficaram fora apenas dessa checagem de formato.
- A PR foi integrada por merge commit
  `baf9c4ceb97a1f66bb583f0fc6364cebf5867a6e`. A CI de PR (`37524206463`) e a
  repetição da CI de push (`37524202791`) passaram para o SHA
  `249bdd9e5c4b0943da45ddbe8486986959b01151`; a CI pós-merge da `main`
  (`37528365304`) passou e executou `build:ci-isolated`, não `npm run build`.
  A primeira tentativa de push falhou somente no teste preexistente de
  concorrência de memória local ao encontrar diretório de backup já criado; a
  repetição passou sem alteração fora do escopo.
- As migrations `0019`–`0026` são entregas versionadas da PR e não foram nem
  serão aplicadas nesta missão. Não houve leitura de `.env`, secrets, banco,
  deploy, Cloudflare, Neon ou qualquer mudança externa.
- O plano versionado `WP-D-RECONCILIATION-PLAN.md` determina que agora seja
  criada
  `codex/wp-d-main-reconciliation` da `main` atualizada e nela seja mesclada
  `origin/codex/wp-d-scenarios`. As migrations `0027` e `0028` serão apenas
  versionadas/revisadas, nunca aplicadas; a PR #5 continua referência congelada.

## Integração controlada PR #10 — 6 de outubro de 2026

- A `main` de partida é `428bcd0f9b5b17e9cde5f1dbbcf863664ffac4aa`. A PR #9
  foi integrada nesse commit; sua CI de PR (`37374731288`) e a CI de push da
  `main` (`37385292264`) passaram. A etapa de `main` executou apenas
  `build:ci-isolated`; `build:hml` permaneceu corretamente ignorado.
- A branch `codex/security-quality-followup` partia de
  `0c0dce2143215102ed07285c45c161deab96d01c` e foi atualizada com a `main`
  atual pelo merge commit `6ec83d6`, sem conflito. O escopo da PR #10 continua
  limitado à retenção segura de artefatos, ao inventário por nomes/rastreamento,
  à análise de vulnerabilidades e aos gates documentais de G1; não houve
  remoção de evidência histórica, alteração de lockfile, secret, migration,
  banco, deploy ou configuração externa.
- A PR #10 foi integrada por merge commit em
  `60ae6ec3049500cc7cad0171ddaccf03f75c8cb0`, preservando sua branch de
  origem. A CI da PR (`37460962766`) e a CI pós-merge da `main`
  (`37461237980`) passaram com testes, lint, typecheck e os builds isolados
  aplicáveis; nenhum build convencional foi executado.
- O diagnóstico e a política desta rodada estão em
  `SECURITY-QUALITY-FOLLOWUP-2026-10-05.md` e
  `BROWSER-ARTIFACT-RETENTION.md`. Novos `playwright-report/` e
  `test-results/` não podem entrar no Git; os artefatos rastreados continuam
  preservados e não foram abertos.
- Em 5 de outubro, o audit registrou 16 vulnerabilidades (7 altas, 9
  moderadas), dez ao omitir dependências de desenvolvimento. O dry-run de
  correção encontrou conflito de peers do Better Auth, sem atualização mínima
  comprovada. Em 6 de outubro, `npm ci --ignore-scripts` exibiu o resumo atual
  do registry com 24 vulnerabilidades (5 críticas, 8 altas, 11 moderadas), sem
  modificar o lockfile; a divergência requer nova revisão de dependências em
  pacote separado, nunca `npm audit fix --force` nesta integração.
- A decisão humana pendente de G1 permanece: comportamento quando a sessão
  do provedor foi emitida e a persistência do contador/auditoria posterior
  falha. A reprodução local existente preserva a evidência; não revogar ou
  manter sessão por inferência.
- A validação de `hostname`/`action` do Turnstile exige política versionada de
  ambiente; contrato e testes necessários foram registrados, sem inventar
  valores HML. Artefatos Playwright históricos foram apenas inventariados por
  nome/rastreamento e preservados; novos caminhos estão ignorados.
- Próxima tarefa, em missão explicitamente autorizada: reconciliar a PR #11
  (`codex/workbook-parity-main-reconciliation` → `main`) com a `main` então
  atual por merge commit, revisar separadamente suas migrations e mudanças
  financeiras e só propor sua integração após os gates aplicáveis. Não iniciar
  nem integrar a PR #11 nesta missão.

Atualizado em 9 de setembro de 2026.

## Atualização AR-G1-HML-2 — 10 de setembro de 2026

- HEAD de código publicado: `99c30d7 feat(auth): require HML distributed rate
limiting`; CI `34468924703` passou para esse SHA. A PR #3 permanece em
  rascunho contra `main`; nenhuma base, merge ou rebase foi alterado.
- `wrangler.jsonc` declara exclusivamente em `env.hml` o binding
  `AUTH_RATE_LIMITER`, namespace `2026091001`, `20` chamadas por `60` segundos
  e `AUTH_RATE_LIMITER_REQUIRED=true`. Sem binding nesse ambiente, os cinco
  fluxos públicos falham fechados; com binding, ele permanece anterior ao
  limiter local. O cooldown durável de cinco tentativas permanece inalterado.
- Validações concluídas: 271 testes, lint, typecheck, Prettier direcionado,
  `git diff --check` e build HML isolado com chave sintética. O aviso nominal
  de secrets ausentes é esperado no build isolado.
- Deploy HML ainda não ocorreu. A sessão não possui a variável pública
  `VITE_TURNSTILE_SITE_KEY`; o script isolado a exige e publicar a chave
  sintética quebraria o widget real. Nenhum `.env`, secret, valor de chave ou
  recurso Cloudflare foi lido ou alterado. A versão ativa anterior permanece o
  rollback disponível.
- Próximo passo exato, em ambiente com a chave pública HML já injetada e sem
  imprimir seu valor: `git status --short --branch && npm run deploy:hml`.
  Depois, listar deployments HML, confirmar binding/version e executar GETs
  anônimos para `/`, `/relatorios` e `/login`. Só então executar browser HML
  sem credenciais; CAPTCHA, identidades e e-mail continuam gates humanos.

## Missão `codex/audit-remediation` — G1 local e decisões G2 em validação

- Branch: `codex/audit-remediation`; checkpoint funcional publicado:
  `8a29760 fix(auth): signal audit persistence failures`. A recuperação partiu
  de `2a7b573`; HEAD, origin e árvore foram reconciliados antes de novas
  alterações. A CI iniciada para esse SHA é `34343787554`; consultar seu
  resultado atual antes de atribuir validação remota a outro commit.
- Pacotes A/B/C implementados nesta missão: proteção de checkpoint e build
  isolado, sanitização de conversas, hardening de auth e experiência do
  Funcionário, idempotência operacional, correção FIFO, autoria/auditoria e
  reconciliação somente leitura. Migrations `0017` e `0018` estão preparadas,
  não aplicadas.
- AR-E1 concluído conforme aceite local. `npm run typecheck` está verde e o workflow versionado
  de CI usa Node 22, `npm ci`, testes, lint, tipos e build HML isolado com
  chave pública sintética.
- Validação desta rodada: `npm test` 248/248; lint, typecheck, Prettier dos
  arquivos alterados e `git diff --check` verdes. `npm run check` global segue
  vermelho com 92 arquivos de dívida histórica, catalogada em
  `FORMATTING-DEBT.md`; não foi reformatada em massa.
- Build no HEAD limpo: `VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build:hml`
  passou para cliente e SSR. O aviso de secrets operacionais ausentes é
  esperado nesta prova isolada e não inclui secret no build.
- A CI `34278599814` passou para o checkpoint `7b07629`, confirmando suíte,
  lint, typecheck e build isolado. Não aplicar migrations, não acessar HML ou
  produção e não executar DESLIGARTUDO.
- Gates: aplicação das migrations em banco descartável, escolha de semântica
  temporal do relatório FIFO, política de tentativas concorrentes no login,
  configuração externa do rate limit e homologação real de auth/FIFO.
- AR-D1 concluído conforme aceite local. A UI exporta somente os
  agregados já carregados pelo loader de `reports:financial:read`; não há novo
  endpoint, escrita ou serviço externo. Campos CSV recebem aspas e valores que
  iniciam fórmula recebem apóstrofo; quantidades e moeda mantêm a string
  decimal exata. Testes específicos, lint, tipos, Prettier e `git diff --check`
  passaram. O runner local interrompe `npm test` depois de 21 arquivos por
  limite de 30 segundos, sem falha; as 48 specs foram executadas em três grupos
  e passaram. O build HML isolado com chave pública sintética passou no
  checkpoint `c44b954`; a ausência de secrets operacionais foi o aviso esperado
  da prova. Próximo passo: registrar esta evidência, publicar e observar CI.
- AR-E2 concluído conforme aceite local e CI. A CI `34264913745` falhou porque `--dry-run` exigia o
  binário Codex antes de executar, embora esse modo não o chame. O preflight
  agora só exige CLI nos modos executáveis; a ausência é reproduzida em teste.
  O lint também apontou controle literal na regex CSV; a expressão preserva a
  mesma proteção construída em runtime. Teste do controlador/CSV, lint,
  typecheck, Prettier, `bash -n`, `git diff --check` e build isolado passaram;
  a CI `34268997522` confirmou a correção.
- Pacote ativo: AR-D2. O histórico de despesas usa a Server Function já
  protegida para filtrar descrição/categoria e período, contar e paginar 20
  itens em ordem estável. A rota conserva filtros na URL e inclui estados de
  carregamento, erro, vazio e paginação acessível. Testes de contrato/paginação,
  lint, tipos, Prettier, `git diff --check` e build HML isolado passaram. A CI
  `34270184144` confirmou o pacote.
- AR-E3 concluído documentalmente. O novo runbook separa recuperação por
  branch isolada de qualquer corte na ativa, define ensaio descartável,
  rollback, observabilidade e retenção sem criar configuração externa. Restam
  decisão de RPO/RTO, responsáveis, cópia independente e ensaio autorizado.
- AR-E4 confirmou 13 vulnerabilidades no `npm audit` completo: cinco altas e
  oito moderadas. A atualização simples de `js-yaml` exige revisão do lockfile;
  as propostas para as cadeias Drizzle e Wrangler usam `--force` e versões
  incompatíveis. Nenhuma dependência foi atualizada. Próximo pacote só deve
  tocar versões após decidir a estratégia e preparar validação completa.
- AR-D3 implementou busca por fornecedor, período e paginação de 20 compras
  na Server Function protegida. A rota preserva filtros na URL, estados de
  carregamento/erro/vazio e a negação de `purchases:read` ao Funcionário. Seis
  testes específicos, lint, typecheck, Prettier e build HML isolado passaram.
  A CI `34295688527` confirmou o pacote; a homologação de interface permanece
  pendente de ambiente autorizado.
- AR-D4 implementou filtros por cliente, status e período, com paginação de 20
  vendas. O corte final inclusivo por data usa UTC como os relatórios; não muda
  receita, CMV, inventário, lifecycle ou permissões. Sete testes específicos,
  lint, typecheck, Prettier e build isolado passaram. A CI `34296133493`
  confirmou o pacote; a homologação de interface aguarda ambiente autorizado.
- AR-D5 implementou busca por nome/SKU, tipo e situação ativa no catálogo, com
  paginação de 20 produtos e estados de carregamento/erro/vazio. Não muda as
  mutações, proteção estrutural ou RBAC. Nove testes específicos, lint,
  typecheck, Prettier e build isolado passaram. A CI `34296485813` confirmou o
  pacote; a homologação de interface aguarda ambiente autorizado.
- Recuperação AR-R1: testes direcionados, lint, typecheck e build isolado já
  iniciados terminaram com código 0. Não há processo Node/npm/tsx/ESLint/tsc/
  Vite da tarefa ativo nem handle de terminal pendente recuperável; nenhum
  processo foi encerrado. A CI `34296485813` corresponde exatamente ao HEAD
  `3c0b335`. A PR #3 em rascunho foi aberta contra `main`; a PR #2 contra
  `g1-auth-adr` permanece aberta e intocada. A CI de pull request `34298609505`
  falhou somente no build HML: o checkout detached foi confundido com `main`.
- AR-D6 preparado: ordenação e filtro dos agregados de relatórios devem usar
  inteiros monetários/quantitativos exatos, sem conversão para `Number`.
  Arquivos previstos: `src/features/reports/calculations.ts` e
  `test/report-calculations.test.ts`. Aceite: valores além do inteiro seguro
  mantêm ordem correta, saldo positivo é decidido por milésimos exatos e a
  alteração continua somente leitura, sem redefinir CMV ou margem. Dezesseis
  testes direcionados, lint, typecheck, Prettier e build isolado passaram.
- AR-E5 preparado: em CI, checkout detached pode usar exclusivamente a
  referência explícita de uma branch de trabalho para `build:hml`. `HML_DEPLOY`
  continua bloqueado nesse modo. A mesma validação local passou.
- AR-D6 e AR-E5 foram aprovados nas CIs `34299895120` (push) e `34299897403`
  (pull request), ambas para `562da42`. A PR #3 está verde, limpa e segue em
  rascunho. Próximo passo: revisão humana da PR e, depois de decisões ou acesso
  específico, A07/A08/A10, dependências e homologações.
- AR-G1-L2 fortaleceu o adaptador Turnstile contra HTTP/JSON inválido e cobriu
  a resolução do binding distribuído nos cinco fluxos públicos. Os 68 testes
  G1 direcionados passaram; CI, HML e replay real ainda não foram executados.
- AR-G1-L3 emite telemetria permitida quando o gravador de auditoria de
  login/logout/OTP falha, sem mudar uma sessão que o provedor já possa ter
  emitido nem expor dados sensíveis. A política de compensação e a confirmação
  HML continuam pendentes de decisão e acesso humano.
- AR-G1-HML-1 confirmou em 10 de setembro o alcance público HML, CI do SHA
  `dfb7e1f`, Neon Auth/branch/domínio e os 270 testes locais. O detalhe remoto
  da versão do Worker não respondeu ao Wrangler, logo não há prova de que o
  deployment execute o SHA da branch. A configuração versionada não declara
  `AUTH_RATE_LIMITER`; navegador, CAPTCHA, identidades, e-mail, replay, cookies
  e revogação real permanecem bloqueados. Consultar
  `G1-HML-TECHNICAL-VALIDATION-2026-09-10.md` antes de retomar o gate humano.
- AR-G2-D1 preparou a decisão de CMV, e AR-E6 analisou as 13 vulnerabilidades.
- Próximo comando de retomada, após conferir `git status --short --branch`:
  `gh run list --branch codex/audit-remediation --limit 3`. Não repetir a
  suíte local se uma execução equivalente estiver ativa. Sem resultado remoto
  confirmado, registrar a CI como pendente; os únicos próximos passos G1 são
  HML, navegador/CAPTCHA, identidade/e-mail autorizados e a decisão de sessão.
  A ordem recomendada de integração é #2 para `g1-auth-adr`, depois G1 para
  `main`, e por fim revisão de #3 contra a base atualizada, sem rebase.

## Retomada local — checkpoint reconciliado e contrato A07-R3

- Humano confirmou `c28c267868e6aa8b80272862dcd6ba558e325cab`; Git local
  confirma HEAD, branch `codex/autonomy-runner`, árvore inicialmente limpa e
  exatamente os sete arquivos de A07-R2. Checkpoint concluído; não recriar.
- A falha anterior de `.git/index.lock` permanece no histórico abaixo.
  A07-R2 está `done`; isso não altera A07, bloqueado para homologação real.
- Missão atual: até três pacotes locais da rodada autorizada. Sem rede,
  ambientes reais, instalação, build convencional, deploy, push, scripts de
  ligar/desligar, outro Codex ou controlador. Uso/reset não disponíveis.
- Seleção: A07-R3, após ler sua definição e A11. Objetivo: exercitar o callback
  real de login com provedor/store sintéticos, observar ordem, falha de
  persistência após sucesso e limites de sanitização. Não alterar aplicação,
  sessão, concorrência, retenção, RBAC ou infraestrutura.
- Arquivos previstos: `test/auth-login-composition.test.ts`, diagnóstico
  Turnstile, fila, handoff, log, status e roadmap (reconciliação de A07-R2).
- Aceite local: testes direcionados, suíte determinística, lint, Prettier
  direcionado e diff revisado. Extração do callback por AST não testa o
  transporte TanStack, validação de entrada, cookies nem persistência real.
  Qualquer validação obrigatória restante impede marcar A07-R3 como `done`.
- Comandos: `env -i PATH="$PATH" node --import tsx --test
test/auth-login-composition.test.ts`; suíte com os arquivos `test/*.test.ts`,
  exceto `codex-autopilot.test.ts`, que executa `--once` até nas fixtures e
  portanto conflita com a proibição desta missão (nenhum teste alterado);
  `env -i PATH="$PATH" node node_modules/eslint/bin/eslint.js`;
  Prettier local apenas nos arquivos do pacote; `git diff --check`.
- Checkpoint: incluir apenas os sete arquivos previstos. Se `.git` recusar
  escrita, preservar trabalho e comandos humanos; parar antes de A11.

## Rodada manual local — contrato A07-R2

- Autorização: missão local de até 20 pacotes; não promove autonomia permanente.
- Branch confirmada: `codex/autonomy-runner`; início limpo em `d55f1fe`,
  zero commits à frente da referência upstream local, sem consultar remoto.
- Objetivo: revisão independente de A07-R1 e testes adicionais de limites e
  falhas dos componentes de cooldown e desafio, com dependências simuladas.
- Vínculo: G1, requisito transversal de autenticação citado nos próximos passos
  de `docs/MVP-01-FUNDACAO.md`. Esse documento também contém MVP-02 (catálogo),
  MVP-03 (histórico), MVP-04 (prévia de produção) e MVP-05 (produção real).
  Não existe equivalência numérica MVP/G: G2 consolida custos/FIFO; G3 amplia
  os relatórios operacionais; G6 evolui a produção do MVP-05; G4/G5/G7 tratam
  integrações e dependências futuras; G8 governa a execução transversal.
- Arquivos previstos: novo teste `test/auth-turnstile-review.test.ts`,
  diagnóstico Turnstile, fila, log e este handoff.
- Dependências: A07-R1 local; Node, tsx, Prettier e ESLint instalados.
- Aceite: testes determinísticos dos componentes verdes, suíte local segura,
  lint, Prettier direcionado e diff revisado; registrar lacunas do handler e
  política concorrente sem inventar decisões. Nenhuma mudança de aplicação;
  build não exigido pelo contrato de testes conforme matriz do runbook.
- Comandos: binários locais diretos, ambiente mínimo; sem npm/npx com download,
  build convencional, navegador, controlador real ou serviços externos.
- A07 permanece bloqueado: build seguro/publicação autorizados, identidade
  adequada e método de validação real ainda necessários.
- Uso/reset: não disponíveis nesta execução.

### Resultado A07-R2 — checkpoint bloqueado

- Seis casos individuais novos passaram por execução direta; a suíte agregada
  passou com 37 arquivos (o runner informa arquivos, não o total individual).
- Nenhuma alteração de aplicação. Diagnóstico corrigido quanto à ordem real
  do handler e acrescido das lacunas de composição/persistência/concorrência.
- Comando de ambiente mínimo com PATH fixo não encontrou Node; usar o PATH
  corrente com `env -i` resolveu, sem carregar arquivos de ambiente.
- Lint, formatação e revisão final registrados no log ao fechar o pacote.
- Parada obrigatória: `git add` falhou ao criar `.git/index.lock` com
  `Read-only file system`. Nenhum commit foi criado e nenhuma permissão
  ampliada foi solicitada. A07-R2 está `blocked` por checkpoint, apesar das
  verificações verdes; nenhum pacote seguinte foi iniciado.
- Próximo passo exato: em uma execução com escrita de Git já permitida,
  revisar os sete arquivos desta rodada, executar Prettier direcionado e
  `git diff --check`, atualizar A07-R2 e criar o commit local descritivo.
  Só depois retomar A07-R3 ou A11. Não executar controlador, ligar/desligar,
  sincronização ou build convencional para resolver este bloqueio.
- Arquivos preservados: teste novo e os documentos `AUTONOMY-HANDOFF.md`,
  `AUTONOMY-LOG.md`, `AUTONOMY-QUEUE.md`, `G1-TURNSTILE-DIAGNOSTIC.md`,
  `PROJECT-STATUS.md` e `ROADMAP-CODEX.md`.
- Os registros abaixo são da sessão anterior e não substituem este fechamento.

## Estado histórico anterior a A07-R2 (não usar para seleção atual)

- pacote ativo: nenhum; A01, A02, A03, A04, A05 e A06 concluídos; A07 bloqueado;
- última execução: leitura pública sanitizada de A06 concluída, sem escrita,
  deploy ou mudança de configuração;
- branch esperada para o piloto: `codex/autonomy-runner`;
- uso Codex: não disponível para esta execução;
- reserva: 5%;
- reset exibido: não disponível;
- escopo concluído: reconciliar as evidências HML em `PROJECT-STATUS.md`,
  `AUTHORIZATION-MATRIX.md`, `G1-EXTERNAL-CONFIGURATION.md`,
  `G1-HML-EXECUTION-PLAN.md`, `G1-CLOUDFLARE-HML.md` e G7. O estado atual
  registra `/login` 200, redirecionamento de `/` sem sessão, `owner`,
  Turnstile/widget/site key/Siteverify; o 403 permanece evidência histórica.
- validação executada: Prettier direcionado passou; `npm test` passou (35
  arquivos de teste, 185 testes); `npm run lint` e `git diff --check` passaram.
  `npm run build` não é aplicável a este pacote exclusivamente documental: a
  tentativa anterior concluiu tecnicamente, mas o Wrangler carregou
  automaticamente `.env.local`. Nenhum valor foi exibido, porém esse
  carregamento viola a política; o EROFS de log é secundário.
- nenhuma ação externa ocorreu; não houve leitura de `.env*`, deploy, acesso a
  Cloudflare, Neon, HML, banco, DNS, Worker, RBAC ou produção.
- A02 classificou 103 falhas de `npm run check` em fonte mantida (39), testes
  mantidos (18), artefatos/relatórios gerados (37), documentação histórica (8)
  e outro (1). O resultado e as recomendações mínimas estão em
  `FORMATTING-DEBT.md`; nenhum dos arquivos classificados foi reformatado.
- a tentativa obrigatória do controlador não iniciou o agente: a CLI falhou ao
  inicializar o app-server em filesystem somente leitura. A classificação foi
  concluída manualmente no mesmo escopo documental; não repetir `--once` sem
  resolver a topologia externa.
- A03 produziu `AUTH-COVERAGE-AUDIT.md`: todos os fluxos e negações previstos
  foram mapeados para código, teste, cobertura negativa e pendência HML.
- A04 conectou login, logout e confirmação de e-mail a um writer de auditoria
  tipado, com `request_id` e razões enumeradas. Os testes locais comprovam
  sucesso/falha e ausência de e-mail, senha, token e cookie nos eventos. O
  ator não é inventado antes de o provedor retornar identidade. A persistência
  real e `access_denied` permanecem pendentes de HML e decisão de retenção/
  boundary assíncrono, respectivamente.
- A07 recebeu autorização humana em 7 de setembro, mas foi bloqueado antes de
  qualquer navegação/rede: não havia navegador disponível nesta sessão. Não
  houve CAPTCHA, login, token, validação de token inválido, replay ou ação HML.
  Para retomar, habilitar navegador, disponibilizar operador humano para o
  CAPTCHA, confirmar identidade HML já autorizada e usar somente o mecanismo
  de replay previamente aprovado; sem ele, registrar bloqueio e não forçar a
  execução.
- O diagnóstico local `G1-TURNSTILE-DIAGNOSTIC.md` confirmou a divergência e a
  correção aprovada preserva `requiresChallenge` do cooldown durável e da
  quinta falha até a UI. O reparo A07-R1 também exige token válido após o
  cooldown expirar e rejeita token inválido/reutilizado pelos fakes locais;
  token válido durante cooldown não contorna o bloqueio. Os testes locais
  passaram; a revisão/publicação e os pré-requisitos de teste seguro ainda são
  necessários. A07 permanece bloqueada até então.
- próximo pacote: nenhum selecionável; A07 está `blocked` e A08–A10 permanecem
  `needs-human`.
- A05 criou `playwright.auth-hml.config.ts`,
  `e2e/auth-hml-non-destructive.spec.ts` e `G1-HML-E2E-RUNBOOK.md`. A
  configuração usa somente a URL HML canônica, não inicia servidor local e
  falha fechada sem opt-in humano. Nenhum browser, Playwright, HML, e-mail,
  reset, OTP, banco ou configuração externa foi acionado.
- A06, autorizado pelo humano, executou exclusivamente GETs anônimos e sem
  corpo/cookie à URL HML canônica: `/` retornou `307` para `/login` e `/login`
  retornou `200`. Os `cf-ray` sanitizados estão em `G1-CLOUDFLARE-HML.md`.
  A07 permanece `needs-human`; não há pacote `ready` sem novo gate.

## Bloqueio do piloto A01

O preflight e o `--dry-run` selecionaram exclusivamente A01 e mantiveram a
árvore limpa. O `--once` não iniciou o agente: o processo Bash era filho de
`codex-linux-sandbox`, e a CLI aninhada falhou ao inicializar o app-server com
`Read-only file system`, inclusive com `--ephemeral`. O caminho de escrita não
foi preservado pelo erro. Uma escrita de teste em diretório temporário foi
bem-sucedida, portanto o bloqueio confirmado é de topologia de execução, não
falha funcional de A01 nem indisponibilidade geral de escrita.

Não houve acesso a Cloudflare, Neon, HML ou produção; nenhuma documentação HML
foi modificada e A01 continua `ready` na fila. Não foi adicionada detecção
automática: não há sinal local estável, documentado e não heurístico.

```bash
cd ~/Projetos/seus-brownies
git switch codex/autonomy-runner
git status --short
./LIGARTUDO --prepare-only
./scripts/codex-autopilot.sh --dry-run
./scripts/codex-autopilot.sh --once
```

## Contrato de retomada

1. confirmar branch de trabalho e `git status`;
2. executar `./LIGARTUDO --prepare-only`;
3. ler `AGENTS.md`, esta fila, este handoff e o último registro do log;
4. continuar somente o próximo passo registrado, sem repetir operações
   idempotentes nem ultrapassar gates humanos.

Ao encerrar por capacidade, registrar o indicador real de uso e reset exibidos
pelo produto; nunca estimar percentuais.

## Handoff M42 — 14 de outubro de 2026 UTC

Base atual: `origin/main`/`main` `961081432f7e4ade133822d7a33300a88eca8fbc`.
Branch de trabalho: `codex/migration-external-evidence`. PR #41 está integrada
e CI pós-merge `38505897780` está verde. Nenhuma migration, SQL externo, deploy,
leitura de `.env` ou secret ocorreu. O próximo comando humano não deve conter
secret: em terminal privado, executar `node scripts/hml-worker-destination.mjs`
e devolver somente JSON sanitizado, versão, UTC e aceite. Depois, fornecer
evidência de role temporária read-only segundo `HML-MIGRATION-EVIDENCE-GATES.md`;
somente então reavaliar se a auditoria de catálogo/journal pode começar.

## Handoff M45 — 16 de outubro de 2026 UTC

Base integrada: `origin/main` `32a9e11984d9d3957340d1ab6ae31adb3b2b22f6`;
PR #43 (`3e19a24`) foi integrada por merge commit e a CI pós-merge
`38922738966` passou. Trabalho atual: `codex/m45-external-audit-gates`, sem
alterações externas. Os scripts LAB-ONLY de role/revogação e o sanitizador do
Worker foram validados localmente; o próximo passo humano exato é o operador,
em terminal privado, executar `node scripts/hml-worker-destination.mjs` e
entregar somente o JSON sanitizado, ticket, responsável, UTC e aceite, junto
com a prova sanitizada da role read-only e backup/restore. Sem isso, manter
`VALIDATION-BLOCKED-NO-READONLY-AUDIT`; não executar SQL, migration, deploy ou
ler segredo. Ver [M45-EXTERNAL-AUDIT-GATES.md](M45-EXTERNAL-AUDIT-GATES.md).
PR #44 foi aberta em rascunho; no SHA `395ebd6`, checks `38983532128`,
`38983546680` e `38983546701` passaram. Não fazer merge desta PR.
