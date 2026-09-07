# Handoff de autonomia — Cacau v1

Atualizado em 7 de setembro de 2026.

## Estado atual

- pacote ativo: nenhum;
- última execução: ainda não executada;
- branch esperada para o piloto: `codex/autonomy-runner`;
- uso Codex: não disponível para esta execução;
- reserva: 5%;
- reset exibido: não disponível;
- próximo passo exato: executar `scripts/codex-autopilot.sh --dry-run` e
  revisar o pacote selecionado antes do primeiro `--once`.

## Contrato de retomada

1. confirmar branch de trabalho e `git status`;
2. executar `./LIGARTUDO --prepare-only`;
3. ler `AGENTS.md`, esta fila, este handoff e o último registro do log;
4. continuar somente o próximo passo registrado, sem repetir operações
   idempotentes nem ultrapassar gates humanos.

Ao encerrar por capacidade, registrar o indicador real de uso e reset exibidos
pelo produto; nunca estimar percentuais.
