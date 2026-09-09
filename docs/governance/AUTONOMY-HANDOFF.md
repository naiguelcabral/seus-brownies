# Handoff de autonomia — Cacau v1

Atualizado em 8 de setembro de 2026.

## Missão `codex/audit-remediation` — correção da CI e precisão de relatórios

- Branch: `codex/audit-remediation`; último checkpoint publicado:
  `3184bbd docs(governance): record recovery checkpoint`; HEAD, origin e
  árvore foram reconciliados após a interrupção de capacidade.
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
  testes direcionados, lint, typecheck e Prettier passaram; build aguarda
  checkpoint limpo.
- AR-E5 preparado: em CI, checkout detached pode usar exclusivamente a
  referência explícita de uma branch de trabalho para `build:hml`. `HML_DEPLOY`
  continua bloqueado nesse modo. A mesma validação local passou; próximo passo:
  revisar, commitar e publicar ambos os pacotes para a CI da PR #3.

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
