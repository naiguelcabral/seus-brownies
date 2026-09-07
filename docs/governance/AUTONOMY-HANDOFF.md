# Handoff de autonomia — Cacau v1

Atualizado em 7 de setembro de 2026.

## Estado atual

- pacote ativo: A01 congelado após reconciliação documental;
- última execução: agente concluiu a edição local, sem rede, escrita externa,
  deploy ou mudança de configuração;
- branch esperada para o piloto: `codex/autonomy-runner`;
- uso Codex: não disponível para esta execução;
- reserva: 5%;
- reset exibido: não disponível;
- objetivo congelado: reconciliar somente as evidências HML conflitantes em
  `AUTHORIZATION-MATRIX.md` e `G1-CLOUDFLARE-HML.md` com G7: `/login` 200,
  redirecionamento de `/` sem sessão, Turnstile publicado e `403` resolvido;
  manter o diagnóstico anterior como histórico.
- fora de escopo: rede, smoke HML, deploy, secrets, DNS, Worker, Neon, `.env`,
  RBAC, código, testes de auth e mudança de estado da fila.
- arquivos previstos: `AUTHORIZATION-MATRIX.md`, `G1-CLOUDFLARE-HML.md`, a
  entrada G7 de `ROADMAP-CODEX.md` e este handoff.
- aceite: os dois registros deixam de declarar o `403` como estado atual,
  registram a evidência publicada sem dados sensíveis e mantêm o diagnóstico
  histórico claramente datado; G7 permanece coerente.
- validação executada: Prettier direcionado, `npm test` (35/35) e `npm run lint`
  passaram; `git diff --check` passou. A execução de `npm run build` terminou
  com build emitido, mas o Wrangler informou carregamento automático de
  `.env.local` e falha de escrita de log fora do workspace. Nenhum valor foi
  registrado, mas o carregamento de `.env.local` viola o limite deste ciclo;
  por isso o resultado é `validation-failed`.
- próximo passo exato: o controlador deve registrar `validation-failed` e não
  criar checkpoint/commit. Antes de nova tentativa, ajustar ou autorizar uma
  validação de build que impeça explicitamente o carregamento de `.env*`; não
  iniciar A02.

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
