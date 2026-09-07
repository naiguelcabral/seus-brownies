# Runbook do piloto de autonomia

## Limites imutáveis

O piloto opera apenas fora da `main`, em árvore limpa e com um pacote por ciclo.
Ele nunca faz deploy, migration em ambiente compartilhado, escrita de dados,
mudança de secrets/DNS/Worker, leitura de `.env` ou execução de
`DESLIGARTUDO`. Diante de um gate, registra `needs-human` e para.

## Uso

```bash
scripts/codex-autopilot.sh --dry-run
scripts/codex-autopilot.sh --once --cycle-timeout 900
scripts/codex-autopilot.sh --loop --max-cycles 3 --cycle-timeout 900
```

`--loop` é opt-in e só pode ser usado após três execuções `--once` verdes
revisadas por humano. O controlador usa a primeira linha da fila com estado
exatamente `ready`; itens `ready-after-*` e `needs-human` não são selecionados.
Após um resultado `done`, o controlador revisa espaços em branco, bloqueia
arquivo `.env*` novo e cria o único commit local de checkpoint do pacote.
Na versão atual da CLI, a execução usa `--approve-for-me`, que a própria CLI
define como revisão automática em sandbox `workspace-write`; ela não usa
`danger-full-access` nem bypass de sandbox.

## Resultado e retomada

O agente deve encerrar sua resposta com exatamente um marcador:
`AUTONOMY_RESULT: done`, `blocked`, `validation-failed`, `needs-human` ou
`limit`. O controlador converte o marcador em código de saída e atualiza o log
sanitizado. A saída JSONL e a trava ficam em `.codex-local/autonomy/`;
`.codex/STOP_AUTONOMY`, lock existente, `main`, árvore suja ou arquivo `.env*`
rastreado impedem a execução antes de chamar o Codex.

Código de saída: `0` concluído, `20` bloqueado, `21` validação falhou, `22`
limite de uso, `23` gate humano, `24` preflight/lock/sentinela ou `2` uso
inválido. A retomada começa pelo `AUTONOMY-HANDOFF.md` e
`./LIGARTUDO --prepare-only`.
