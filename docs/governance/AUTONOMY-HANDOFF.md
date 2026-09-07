# Handoff de autonomia — Cacau v1

Atualizado em 7 de setembro de 2026.

## Estado atual

- pacote ativo: A01 não iniciado;
- última execução: piloto bloqueado antes de iniciar o agente;
- branch esperada para o piloto: `codex/autonomy-runner`;
- uso Codex: não disponível para esta execução;
- reserva: 5%;
- reset exibido: não disponível;
- próximo passo exato: resolver a inicialização local do app-server do Codex
  em sistema de arquivos gravável, confirmar `--dry-run` e executar um único
  `--once` para A01. Não executar A02 enquanto A01 permanecer `ready`.

## Bloqueio do piloto A01

O preflight e o `--dry-run` selecionaram exclusivamente A01 e mantiveram a
árvore limpa. O `--once` não iniciou o agente: a CLI local falhou ao criar seu
app-server em sistema de arquivos somente leitura, inclusive com `--ephemeral`.
Não houve acesso a Cloudflare, Neon, HML ou produção; nenhuma documentação HML
foi modificada e A01 continua `ready` na fila.

## Contrato de retomada

1. confirmar branch de trabalho e `git status`;
2. executar `./LIGARTUDO --prepare-only`;
3. ler `AGENTS.md`, esta fila, este handoff e o último registro do log;
4. continuar somente o próximo passo registrado, sem repetir operações
   idempotentes nem ultrapassar gates humanos.

Ao encerrar por capacidade, registrar o indicador real de uso e reset exibidos
pelo produto; nunca estimar percentuais.
