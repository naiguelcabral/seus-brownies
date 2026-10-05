# Captura local e limites de sanitização

O hook `conversation_memory.py notify` recebe `input-messages` e
`last-assistant-message` de `agent-turn-complete` e grava Markdown local.
Não captura toda a transcrição, raciocínio, chamadas/resultados de ferramentas
ou saídas de terminal por esse contrato. O helper `readable` aceita somente os
campos textuais conhecidos; payloads desconhecidos são ignorados, nunca
serializados integralmente. O texto aceito passa pelo redator.
Referência do contrato: [configuração oficial do Codex](https://developers.openai.com/codex/config-advanced).

O script opcional `record_terminal_session.sh` usa `script` para registrar a
saída bruta de um Bash filho, incluindo comandos/saídas visíveis. Esse arquivo
é **bruto e não sanitizado**. Não iniciar captura durante acesso a credenciais.
O diretório `terminal/raw` também é local; sua existência não comprova captura.
Não há conversão automática, carregamento como instrução ou incorporação de
terminal bruto à memória Markdown neste repositório.

Conversas, contexto, snapshots Git, índices e histórico ficam em
`.codex-local`, ignorada e bloqueada no guard de checkpoint. Diretórios usam
`0700`; arquivos gerenciados usam `0600`; a captura de terminal usa `umask
077`. O redator cobre Authorization/Bearer/Basic, cookies, URLs com
credenciais, URIs de banco, atribuições conhecidas, sufixos compostos sensíveis
e chaves privadas. São heurísticas, não prova de ausência de todo segredo.
Sanitizar não autoriza publicar esses arquivos.

Cada conversa é limitada a 240.000 caracteres, com até 10 arquivos
rotacionados por sessão. A retomada usa no máximo 60.000 caracteres; snapshots
Git mantêm até 20 arquivos e o índice, até 200 entradas. Snapshots registram
somente metadados e nomes fornecidos pelo Git, com limite e sanitização; não
leem conteúdo dos arquivos. Logs brutos de terminal têm retenção manual e
permanecem separados da memória carregável.
