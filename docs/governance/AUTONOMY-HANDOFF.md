# Handoff de autonomia — Cacau v1

Atualizado em 7 de setembro de 2026.

## Estado atual

- pacote ativo: nenhum; A01, A02, A03, A04 e A05 concluídos;
- última execução: preparação local do E2E não destrutivo de A05 concluída, sem rede,
  escrita externa, deploy ou mudança de configuração;
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
- próximo pacote na fila: A06 — validar HML por leituras públicas seguras;
  permanece `needs-human` e não foi iniciado nesta execução.
- A05 criou `playwright.auth-hml.config.ts`,
  `e2e/auth-hml-non-destructive.spec.ts` e `G1-HML-E2E-RUNBOOK.md`. A
  configuração usa somente a URL HML canônica, não inicia servidor local e
  falha fechada sem opt-in humano. Nenhum browser, Playwright, HML, e-mail,
  reset, OTP, banco ou configuração externa foi acionado. A06 permanece
  `needs-human`; não há pacote `ready` sem novo gate.

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
