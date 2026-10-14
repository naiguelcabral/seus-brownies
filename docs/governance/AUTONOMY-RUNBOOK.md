# Runbook do piloto de autonomia

## Limites imutáveis

O piloto opera apenas fora da `main`, em árvore limpa e com um pacote por ciclo.
Ele nunca faz deploy, migration em ambiente compartilhado, escrita de dados,
mudança de secrets/DNS/Worker, leitura de `.env` ou execução de
`DESLIGARTUDO`. Diante de um gate, registra o impedimento sem contorná-lo.
Em `--once`, encerra com o código correspondente. Em `--loop` autorizado,
se não houver alterações pendentes do agente, cria somente um checkpoint
local do log sanitizado e procura outro pacote exatamente `ready`.

## Matriz de validação por tipo de pacote

| Tipo                | Verificações permitidas                                                                                                                                                                  | Restrições                                                                                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `documental`        | Prettier direcionado, `git diff --check`, verificações documentais direcionadas e testes do controlador quando seus arquivos mudarem; `npm test` e lint somente se previstos no contrato | Nunca executar build ou check global.                                                                                                                                                                                           |
| `codigo`            | Testes direcionados, `npm test` e lint conforme o contrato                                                                                                                               | Build somente por mecanismo previamente comprovado como isolado de arquivos secretos. Se o aceite exigir build e não houver tal mecanismo, registrar `validation-blocked` ou `needs-human`; nunca substituir pelo build padrão. |
| `auditoria-leitura` | Somente inspeções previstas no contrato                                                                                                                                                  | Nunca executar build, alterar estado externo, escrever em banco ou HML.                                                                                                                                                         |

O tipo `codigo-build-obrigatorio` explicita um aceite que depende de build.
Enquanto não houver mecanismo isolado comprovado, o controlador o bloqueia
antes de chamar o agente e registra `validation-blocked`.

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

## Continuidade após gate

`blocked`, `needs-human` e `validation-blocked` permitem continuar no loop
somente se a árvore estava limpa antes de registrar o resultado. Nenhum
código pendente é descartado ou commitado para possibilitar continuidade.
`validation-failed`, erro da CLI, `limit`, sentinela, lock, caminhos sensíveis
e falha de preflight continuam encerrando imediatamente. O loop não
promove `ready-after-*` e não tenta novamente um ID na mesma execução,
mesmo que a fila ainda o apresente como `ready`. O número de ciclos limita
as tentativas; o código final preserva gates encontrados (23 tem prioridade
sobre 21 e 20), mesmo que outro pacote tenha concluído. Uma nova execução
reavalia a fila e os gates; não há promoção permanente de autonomia.

O resultado é lido da última linha exata de `--output-last-message`, em
arquivo local privado, sem interpretar marcadores presentes em ferramentas
ou outros eventos JSONL. JSONL e mensagem final ficam somente no diretório
ignorado. Referência: [OpenAI Docs — execução não interativa](https://learn.chatgpt.com/docs/non-interactive-mode#make-output-machine-readable).

## Resultado e retomada

O agente deve encerrar sua resposta com exatamente um marcador:
`AUTONOMY_RESULT: done`, `blocked`, `validation-failed`,
`validation-blocked`, `needs-human` ou `limit`. O controlador converte o
marcador em código de saída e atualiza o log sanitizado. A saída JSONL, a trava
e a sentinela `STOP_AUTONOMY` ficam em
`.codex-local/autonomy/`; lock existente, `main`, árvore suja ou arquivo `.env*`
rastreado impedem a execução antes de chamar o Codex.

Código de saída: `0` concluído, `20` bloqueado, `21` validação falhou, `22`
limite de uso, `23` gate humano, `24` preflight/lock/sentinela ou `2` uso
inválido. A retomada começa pelo `AUTONOMY-HANDOFF.md` e
`./LIGARTUDO --prepare-only`.
