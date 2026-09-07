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

## Topologia obrigatória para `--once` e `--loop`

O controlador deve ser iniciado em um terminal Bash comum e independente; ele
não deve ser iniciado por outra sessão ativa do Codex. No VS Code, abra um
segundo terminal independente e encerre a sessão interativa que preparou o
piloto antes de iniciá-lo. Nesta topologia, `--dry-run` pode ser usado pelo
agente atual, mas `--once` e `--loop` devem ser iniciados externamente.

Evidência do piloto de 2026-09-07: o Bash que chamou o controlador era filho do
processo `codex-linux-sandbox`; o `codex exec` aninhado falhou ao inicializar o
app-server com `Read-only file system`, inclusive com `--ephemeral`. O erro não
preservou o caminho de escrita do app-server. A escrita em diretório temporário
funcionou, portanto não há evidência de indisponibilidade geral de escrita.

Não há sinal local estável e documentado que permita ao script detectar essa
topologia sem heurística frágil. O controlador não deve tentar bloqueá-la por
variável interna ou inspeção de processo; siga o procedimento manual abaixo.

```bash
cd ~/Projetos/seus-brownies
git switch codex/autonomy-runner
git status --short
./LIGARTUDO --prepare-only
./scripts/codex-autopilot.sh --dry-run
./scripts/codex-autopilot.sh --once
```

Com A01 em `ready`, `--once` selecionará somente A01 e terminará antes de A02.

`--loop` é opt-in e só pode ser usado após três execuções `--once` verdes
revisadas por humano. O controlador usa a primeira linha da fila com estado
exatamente `ready`; itens `ready-after-*` e `needs-human` não são selecionados.
Após um resultado `done`, o controlador revisa espaços em branco, bloqueia
arquivo `.env*` novo e cria o único commit local de checkpoint do pacote.
Na versão atual da CLI, a execução usa `--approve-for-me`, que a própria CLI
define como revisão automática em sandbox `workspace-write`; ela não usa
`danger-full-access` nem bypass de sandbox. Usa também `--ephemeral`, para não
persistir arquivos de sessão fora do diretório local do controlador.

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
