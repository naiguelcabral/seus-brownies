# Handoff de autonomia — Cacau v1

## Reconciliação WP-D com a main — em execução, 6 de outubro de 2026

- Objetivo: reconciliar metas e cenários em
  `codex/wp-d-main-reconciliation`, validar localmente e abrir somente uma PR
  em rascunho para revisão humana. Não integrar PR, aplicar migrations,
  escrever em banco, fazer deploy ou tocar em `.env`, secrets, Cloudflare ou
  Neon.
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
- Escopo preservado para validação: cenários versionados e auditados, mix com
  peso original e normalização exata de 103% para 100%, projeções separadas de
  realizados, RBAC server-side, ativo único, revisão otimista e migrations
  aditivas `0027`/`0028` apenas versionadas. Testes previstos: `npm ci
--ignore-scripts`, suíte, lint, tipos, Prettier direcionado, diff check e os
  builds isolados com chave pública sintética.
- Gates externos: revisão humana da PR, aplicação autorizada das migrations em
  ambiente controlado e homologação HML de Dono, Gerente e negações por papel.
  PR #5 permanece congelada e não deve ser retargetada, fechada ou alterada.

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
