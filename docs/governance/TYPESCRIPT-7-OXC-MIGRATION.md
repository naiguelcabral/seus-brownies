# TypeScript 7 e ferramentas Oxc

## Escopo

Migração local autorizada em 16 de outubro de 2026, na branch
`codex/typescript-7-upgrade`. TypeScript 7.0.2 passa a ser a única versão do
compilador no lockfile. ESLint, o preset TanStack, Prettier e os aliases de
compatibilidade TS 6 foram removidos das dependências diretas.

Versões fixadas: Oxlint 1.88.0, oxlint-tsgolint 7.0.2004, Oxfmt 0.73.0,
oxc-parser e oxc-transform 0.154.0. `tsc --noEmit` permanece separado do lint.

O teste de composição do login usa o AST do Oxc para localizar o export real,
validar a chamada `.handler` e executar seu callback transformado. As asserções
dos oito cenários originais continuam presentes, incluindo a ordem de proteção,
provedor, auditoria, contador e cookie. Nenhum callback foi copiado ou substituído
por uma implementação de teste.

## Regras

A configuração efetiva anterior tinha 69 regras ativas em uma rota TSX.
O conversor oficial `@oxlint/migrate --type-aware --with-nursery
--js-plugins=false` identificou 65 regras com implementação nativa. Suas
severidades e opções efetivas foram transferidas explicitamente.

| Regra anterior                   | Tratamento                                                                                                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 65 regras core/import/TypeScript | Mantidas, incluindo `no-unnecessary-condition` e `no-unnecessary-type-assertion` com informação de tipos. A primeira é classificada como nursery na migração e está habilitada explicitamente. |
| `node/prefer-node-protocol`      | Substituída pela implementação nativa `unicorn/prefer-node-protocol`.                                                                                                                          |
| `no-octal`                       | Sem regra equivalente; literais octais legados são erros de sintaxe no modo módulo do parser.                                                                                                  |
| Naming de parâmetros genéricos   | Convenção estilística anterior não portada; não introduzimos plugin legado dependente da API TypeScript 6.                                                                                     |
| `@stylistic/spaced-comment`      | Convenção estilística anterior não portada; Oxfmt cuida da formatação, sem alegar equivalência exata dessa regra.                                                                              |

As regras de ordenação de imports, array-type e require-await desabilitadas no
projeto continuam sem ativação. A categoria ampla `correctness` fica desligada
para que as regras sejam escolhidas explicitamente, evitando habilitar de forma
indireta regras experimentais do React Compiler.

Foram adicionadas regras de Hooks/dependências, chaves e propriedades JSX,
mutação de estado React, atributos ARIA/alt-text e promises soltas/usadas em
lugares inadequados. Handlers JSX podem retornar promises; o restante da regra
`no-misused-promises` permanece ativo. Registros `test`, `it` e `describe` do
pacote `node:test` são chamadas conhecidas seguras apenas em arquivos de teste:
o runner acompanha sua execução. Outras promises soltas continuam rejeitadas,
como demonstra a fixture de contrato.

Uma supressão localizada preserva o erro obrigatório quando o rollback do
verificador de evidência falha: esse erro deve sobrepor o resultado anterior e
exigir o fechamento da conexão. A política e o comportamento não foram alterados.

## Dependências transitivas

O logger distribuído pelo Triplit declarava peer TypeScript 5 e provocava duas
cópias antigas do compilador. Seus arquivos JavaScript e declarações distribuídos
não importam a API TypeScript. O override `typescript: 7.0.2` unifica a resolução;
não altera a versão nem o código de Triplit/Neon Auth. O contrato do lockfile
impede o retorno de compiladores antigos. Atualizações futuras do TypeScript
precisam atualizar conjuntamente a dependência e o override.

## Formatação e CI

Oxfmt preserva `semi: false`, `singleQuote: true`, `trailingComma: all` e largura 80. Ordenação de imports e de package.json permanece desativada. O escopo dos
scripts `format` e `check` é explícito: fontes, testes, scripts e configurações
mantidos. O arquivo gerado `src/routeTree.gen.ts`, migrations, dados, relatórios
Playwright, memória local e documentos históricos ficam fora dos ajustes.

A dívida histórica de `FORMATTING-DEBT.md` é preservada como registro da antiga
checagem global Prettier; o novo check não afirma que toda a documentação ou
todos os artefatos históricos foram normalizados. A CI passa a exigir o check
Oxfmt desse escopo, além de testes, lint e tipos.

## Validação

Instalação limpa com `npm ci`, `npm run typecheck`, `npm run lint` sem avisos,
`npm run check` de 267 arquivos, 456 testes e build HML isolado aprovados.
`npm ls typescript --all` confirma apenas 7.0.2; não há ESLint nem API TS 6
instalados. Prettier permanece somente como dependência interna de pacotes
externos, incluindo o gerador de rotas TanStack, sem uso nos scripts do projeto.

Fixtures de toolchain comprovaram resolução única do compilador, rejeição de
promises soltas/Hooks inválidos e check/write Oxfmt sem ordenar imports. A
comparação dos 39 arquivos de código existentes alterados encontrou equivalência
do AST do JavaScript emitido em 36; os três restantes são as adaptações revisadas
de composição do login, asserções de lifecycle e nome local no script descartável.

O build usou HEAD com o diff e os novos arquivos em diretório temporário,
dependências do lockfile final, ambiente limpo e chave pública sintética.
A entrega ainda depende de revisão/integração e CI remota; não inclui migration,
aplicação HML ou deploy.

Referências: [migração Oxlint](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html),
[lint tipado](https://oxc.rs/docs/guide/usage/linter/type-aware.html),
[migração Oxfmt](https://oxc.rs/docs/guide/usage/formatter/migrate-from-prettier.html).
