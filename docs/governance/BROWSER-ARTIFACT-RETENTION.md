# Retenção de artefatos de navegador

Atualizado em 5 de outubro de 2026. Esta política não apaga nem reescreve
evidências já versionadas.

## Regra atual

- As configurações Playwright ativas escrevem artefatos novos em `/tmp`, nunca
  no repositório: a suíte local usa `/tmp/seus-brownies-playwright` e a
  homologação de autenticação usa `/tmp/seus-brownies-auth-hml-e2e`.
- `playwright-report/` e `test-results/` são ignorados para impedir que uma
  configuração futura ou uma execução manual volte a introduzir relatórios,
  traces, vídeos, screenshots, cookies ou corpos de resposta no Git.
- A homologação HML de autenticação mantém trace, screenshot e vídeo
  explicitamente desligados. Ela continua bloqueada até o opt-in humano
  documentado na matriz G1.
- Nenhum artefato histórico rastreado é removido automaticamente. A lista
  abaixo é somente um inventário de nomes e rastreamento Git; seu conteúdo não
  foi aberto nesta revisão.

## Inventário para decisão humana

O commit histórico `b095808` introduziu artefatos Playwright rastreados. Na
base `origin/main` revisada em 2026-10-05, há:

- 22 caminhos em `playwright-report/`, incluindo dados, trace e o relatório
  HTML;
- 8 caminhos em `test-results/`, incluindo o resultado resumido e artefatos
  de duas execuções HML históricas.

Antes de qualquer remoção, o responsável deve decidir se cada conjunto será
preservado em armazenamento de evidências com controle de acesso ou removido
por um commit humano específico. A decisão precisa registrar o commit de
origem, hash dos arquivos, período de retenção, responsável e confirmação de
que não contém token, cookie, credencial, PII ou conteúdo operacional que não
possa ser retido. Até isso acontecer, não abrir, baixar, anexar a PR, copiar
nem alterar esses arquivos.

## Verificação contínua

`test/browser-artifact-policy.test.ts` protege a configuração de saída fora do
repositório e as regras de ignore. Esta proteção complementa, e não substitui,
o guard de caminhos sensíveis no staging.
