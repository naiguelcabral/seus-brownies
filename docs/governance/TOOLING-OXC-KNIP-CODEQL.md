# Modernização incremental: Oxlint, Oxfmt, Knip e CodeQL

Data da proposta: 2026-10-17. Estado: **PR de implantação, não homologada**.

## Limites e escopo

Este pacote configura quatro ferramentas sem modificar regras de negócio, Drizzle, migrations, Neon, HML, produção, segredos, credenciais ou deploy.

ESLint 9, Prettier 3, `tsc --noEmit`, Node Test Runner e Playwright continuam sendo as ferramentas oficiais existentes. O CI original **não é enfraquecido**. Não aplicar fixes automáticos, apagar código sinalizado pelo Knip ou substituir regras do TanStack sem avaliação.

## Comandos experimentais

```bash
npm ci
npm run lint:ox
npm run format:ox:check
npm run knip:audit
```

Somente depois de comparar os diffs e garantir cobertura, a formatação deliberada pode ser executada manualmente na branch de trabalho:

```bash
npm run format:ox:write
```

Versões de execução fixadas em `package.json`:
- Oxlint `1.88.0`
- Oxfmt `0.73.0`
- Knip `6.41.0`

**Decisão provisória**: as ferramentas são executadas via `npm exec --yes --package=<versão>` (instalação sob demanda em cache npm), sem adicionar dependências ao `package-lock.json` gerado e auditável. Esse modo requer conexão com o registry npm na primeira execução. Quando houver ambiente Node/npm com acesso ao registry e CI validada, preferir `npm install -D --save-exact oxlint@1.88.0 oxfmt@0.73.0 knip@6.41.0`, versionar **juntos** `package.json` e `package-lock.json` e simplificar scripts para comandos locais. Nunca alterar somente o manifesto deixando o lock inválido.

## Oxlint

- Arquivo: `.oxlintrc.json`.
- Analisa `src`, `test`, `e2e` e `scripts`; ignora artefatos e `routeTree.gen.ts`.
- Categorias correctness/suspicious em aviso para diagnóstico inicial.
- Comparar tipos, regras ESLint/TanStack, importação e avisos antes de tornar o check obrigatório.
- `npm run lint` continua bloqueante.

## Oxfmt

- Arquivo: `.oxfmtrc.json`.
- Mantém `semi: false`, `singleQuote: true`, `trailingComma: all` e largura de linha 80, como Prettier existente.
- Ordenação de imports e `package.json` explicitamente desativadas para não produzir mudanças sem revisão.
- `format:ox:check` não modifica arquivos. Diferenças de formatação devem ser avaliadas sem reformatação em massa.
- `npm run check` continua usando Prettier até a decisão de migração.

## Knip

- Arquivo: `knip.json`, com pontos de entrada explícitos para rotas TanStack, testes, scripts e configs.
- Resultados são **candidatos a revisão**, nunca autorização automática para exclusão. Entry points importados dinamicamente podem gerar falsos positivos.
- Após triagem, aprimorar entradas e verificar módulos referenciados por metadados, scripts shell, migrations e integração Cloudflare.

## GitHub Actions

- `.github/workflows/tooling-preview.yml` executa Oxlint, Oxfmt e Knip na PR.
- Cada etapa é `continue-on-error` apenas neste job diagnóstico, com outcomes reportados em `GITHUB_STEP_SUMMARY`; o job verde não significa diagnósticos aprovados.
- `.github/workflows/codeql.yml` usa CodeQL v4, JavaScript/TypeScript, suíte `security-extended`, `build-mode: none`, permissões mínimas, PR, push main, agenda semanal e disparo manual.
- CodeQL não é advisory; falhas próprias da análise precisam ser investigadas. Verificar se a configuração de Code Scanning da conta permite envio de SARIF.
- O workflow `.github/workflows/ci.yml` mantém todos os gates existentes.

## Critérios antes de promover

1. Verificar as execuções reais de ambas as workflows em GitHub Actions.
2. Quantificar achados de Oxlint e validar cobertura equivalente às regras fundamentais do ESLint.
3. Investigar diferenças do Oxfmt antes de substituir Prettier.
4. Triar falsos positivos do Knip sem apagar código automaticamente.
5. Confirmar CodeQL gerando resultados no Code Scanning (não apenas job verde).
6. Reexecutar `npm test`, `npm run lint`, `npm run typecheck`, `npm run check` e build isolado.
7. Revisar e aprovar a PR antes de qualquer merge.
