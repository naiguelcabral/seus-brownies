# Captura local e limites de sanitização

O hook `conversation_memory.py notify` recebe `input-messages` e
`last-assistant-message` de `agent-turn-complete` e grava Markdown local.
Não captura toda a transcrição, raciocínio, chamadas/resultados de ferramentas
ou saídas de terminal por esse contrato. Um campo recebido em formato de
objeto pode ser serializado pelo helper `readable`; o texto passa pelo redator.
Referência do contrato: [configuração oficial do Codex](https://developers.openai.com/codex/config-advanced).

O script opcional `record_terminal_session.sh` usa `script` para registrar a
saída bruta de um Bash filho, incluindo comandos/saídas visíveis. Esse arquivo
é **bruto e não sanitizado**. Não iniciar captura durante acesso a credenciais.
O diretório `terminal/raw` também é local; sua existência não comprova captura.
Não há conversão automática de terminal bruto para Markdown neste repositório.

Conversas, contexto e histórico ficam em `.codex-local`, ignorada e bloqueada
no guard de checkpoint. Pasta base 0700; conversas/contexto 0600; captura de
terminal usa umask 077. O redator cobre Authorization/Bearer/Basic, cookies,
URLs com credenciais, URIs de banco, atribuições conhecidas e chaves privadas.
São heurísticas, não prova de ausência de todo segredo. Sanitizar não autoriza
publicar esses arquivos. Não reprocessamos nem lemos logs/conversas existentes.
Retenção automática permanece indefinida: não apagar evidências nesta missão.

## Revisão preparada do PR #2

Em 2026-09-07 a API confirma PR aberto, origem
`feat/codex-conversation-memory`, destino `g1-auth-adr`. Os commits da memória
já estão na ancestry da branch desta missão. Evitar reaplicação integral.
Revisar destino e consolidar os reparos de sanitização antes de integrar.
Não houve comentário enviado, fechamento, merge ou mudança do PR.
