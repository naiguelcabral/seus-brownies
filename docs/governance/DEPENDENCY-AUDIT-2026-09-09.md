# Análise de dependências — `npm audit`

Executada em 9 de setembro de 2026 com o lockfile atual: 13 vulnerabilidades,
cinco altas e oito moderadas. Esta análise não atualiza dependências.

| Cadeia                                                  | Severidade | Uso                                            | Exposição observada                                                           | Correção e impacto                                                             |
| ------------------------------------------------------- | ---------- | ---------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `js-yaml@4.3.1` por TanStack Start/xmlbuilder2 e ESLint | alta       | build/ferramentas; presente na árvore de Start | o código não processa YAML enviado por usuário                                | correção transitiva sem major indicada; validar lockfile, build e CI           |
| sharp -> miniflare -> Wrangler/Vite plugin              | alta       | somente dev/CI                                 | não há upload ou decodificação de imagem pelo produto                         | audit sugere mudança incompatível de Wrangler; revisar ferramenta e HML juntas |
| Wrangler, miniflare e Vite plugin                       | alta       | somente dev/CI                                 | requer execução local/CI das ferramentas Cloudflare                           | não usar `--force`; validar Worker/Vite em branch isolada                      |
| esbuild <=0.24 por `@esbuild-kit/*` -> drizzle-kit      | moderada   | ferramenta de migration                        | advisory depende de servidor de desenvolvimento exposto; nenhum é público     | audit sugere Drizzle Kit incompatível; revisar migrations antes de trocar      |
| better-auth, Neon Auth/auth-ui/neon-js beta             | moderada   | autenticação, potencialmente runtime           | depende do advisory do provedor e do fluxo Neon publicado; não foi comprovado | major ou correção incompatível; matriz Neon/cookies/reset/HML necessária       |

`npm explain` confirmou `js-yaml` por
`@tanstack/react-start -> start-plugin-core -> xmlbuilder2` e também por
ESLint. Confirmou `sharp` como desenvolvimento por Wrangler/Vite plugin via
miniflare. Não há evidência local de exploração por usuários.

Recomendação: preparar PR separada primeiro para a correção transitiva
não-major de `js-yaml`, com lockfile mínimo e CI completa. Manter Neon,
Drizzle e Cloudflare bloqueados até compatibilidade e rollback aprovados. Não
executar `npm audit fix --force`.
