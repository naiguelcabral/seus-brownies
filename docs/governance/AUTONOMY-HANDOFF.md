# Handoff de autonomia — Cacau v1

Atualizado em 7 de setembro de 2026.

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

## Estado atual

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
