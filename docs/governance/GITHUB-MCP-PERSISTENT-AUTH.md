# GitHub MCP: credencial persistente do Codex

O launcher do projeto obtém o PAT do GitHub no GNOME Keyring / Secret Service e
entrega `GITHUB_PAT_TOKEN` apenas ao processo do Codex e seus filhos. A entrada
usa os atributos `service=seus-brownies-codex`, `account=github-mcp` e
`key=github-pat`. O arquivo de configuração do MCP guarda somente o nome da
variável (`bearer_token_env_var = GITHUB_PAT_TOKEN`).

## Configuração e rotação

Execute `scripts/codex/setup-github-mcp-credential.sh` em um terminal
interativo. Ele solicita o PAT sem eco. Se `GITHUB_PAT_TOKEN` já estiver no
ambiente, usa esse valor. Reexecutar o comando substitui a entrada no keyring.
Para remover apenas esta entrada, use
`scripts/codex/setup-github-mcp-credential.sh --remove` manualmente.

## Verificação e início

Use `scripts/codex/setup-github-mcp-credential.sh --check` para conferir a
presença da entrada sem exibir o valor. Use
`scripts/codex/start-codex.sh --check` para conferir keyring, Codex CLI e
configuração do GitHub MCP. Em um sandbox sem acesso ao Secret Service, a
falha de lookup exige repetir o check no terminal do host; ela não desfaz uma
confirmação já feita no host.

Inicie o Codex com `scripts/codex/start-codex.sh` ou `./LIGARTUDO --codex`.
O segundo caminho prepara o projeto e valida os MCPs antes do launcher, sem
iniciar o servidor HML. O launcher obtém a credencial diretamente do keyring,
inclusive quando não há `GITHUB_PAT_TOKEN` exportado no shell inicial.

MCPs exigidos no preflight: `github`, `neon`, `cloudflare-api`,
`cloudflare-docs`, `cloudflare-observability`, `cloudflare-builds` e
`openaiDeveloperDocs`. `cloudflare-bindings` é opcional e não bloqueia o
início.
