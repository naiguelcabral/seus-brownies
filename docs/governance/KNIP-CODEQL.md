# Knip e CodeQL no Cacau

## Escopo e comandos

Knip 6.41.0 é dependência de desenvolvimento fixada em `package.json` e
`package-lock.json`. Use `npm ci`; não há download por `npm exec` durante a
análise. As regras e versões atuais de TypeScript 7/Oxlint/Oxfmt são preservadas.

| Comando | Resultado |
| --- | --- |
| `npm run knip:audit` | Diagnóstico completo, legível; sai com 1 enquanto houver achados, inclusive os conhecidos |
| `npm run knip:report` | Mesmo diagnóstico completo em JSON; sai com 1 enquanto houver achados |
| `npm run knip:check` | Gate bloqueante da CI: compara os achados completos com a baseline versionada e imprime todos eles |

`knip.json` cobre TypeScript/JavaScript em `src`, `test`, `e2e`, scripts
administrativos e configurações. Rotas TanStack, bootstrap do framework,
testes, comandos e configurações são entradas explícitas. Exports das entradas
seguem o comportamento padrão do Knip: podem ser consumidos pelo framework ou
pela execução externa. Isso não comprova que toda API exportada é necessária.
Apenas declarações e a árvore de rotas gerada são ignoradas na análise Knip.

Os plugins Drizzle, Vite e Playwright têm `config: []`. Seus arquivos permanecem
entradas estáticas, sem avaliação dinâmica que possa carregar arquivos de
ambiente, iniciar o Worker ou conectar ao banco. O teste de integração usa
configs sintéticas que lançam erro se executadas e confirma a geração do
relatório, imports ausentes, dependência sem uso e arquivo órfão.

## Revisão das 48 ocorrências — 18 de outubro de 2026 (UTC)

Revisão manual de consumidores em fontes, rotas, testes, E2E, scripts e
configurações: **45 ocorrências resolvidas e três referências contextuais
mantidas, todas justificadas**. Nenhuma ocorrência ficou sem classificação.
Não foram ampliados ignores, entradas artificiais ou supressões no Knip/CodeQL.

| Disposição | Quantidade | Evidência/limite |
| --- | ---: | --- |
| Arquivos órfãos removidos | 10 | Header antigo, sete controles UI, utilitário `cn` e catálogo estático de demonstração; nenhum consumidor nas rotas atuais |
| Dependências diretas removidas | 7 | Três pacotes React TanStack sem imports e quatro bibliotecas exclusivas dos controles/utilitário órfãos |
| Exports tornados internos | 21 | Funções, constantes e tipos continuam usados no próprio módulo; corpos de validações, cálculos e regras preservados |
| Declarações sem qualquer uso removidas | 7 | Dois exports de valor e cinco tipos; contratos ativos de autenticação, validação financeira e lifecycle preservados |
| Referências contextuais mantidas | 3 | Usos reais fora da modelagem usual do grafo JS/TS, detalhados abaixo |

A baseline contém somente:

- `tw-animate-css`, importado por `src/styles.css`, alcançado pela rota raiz.
  Manter a dependência CSS; o relatório JS/TS não reconhece esse consumidor.
- `cloudflare` em `src/features/auth/cloudflare-rate-limit.server.ts`: import
  de `cloudflare:workers`, módulo virtual fornecido pelo runtime. Não instalar
  um pacote npm chamado `cloudflare` para satisfazer o diagnóstico.
- `@esbuild-kit/core-utils` em `test/security-dependencies.test.ts`: o teste
  exercita intencionalmente o loader transitivo do Drizzle e seu esbuild
  corrigido. Declarar outra dependência direta poderia mascarar a ausência
  desse caminho transitivo; preservar o teste e o override de segurança.

Cada item retido tem `reason` em `knip-baseline.json`. Não são correções
pendentes. Se um consumidor ou a árvore transitiva mudar, rever a justificativa
e remover a tolerância resolvida; novos achados continuam bloqueantes.
`knip:audit`/`knip:report` continuam retornando 1 pelas três referências,
enquanto `knip:check` aceita apenas a lista exata revisada.

O catálogo estático removido não é o catálogo operacional nem contém os 17
SKUs importados do workbook. Esta limpeza não executa escrita em banco,
importação, migration ou deploy. Não altera a estratégia de login/RBAC,
precisão monetária, FIFO ou regras de estoque.

### Validação da revisão

Instalação limpa com `npm ci --ignore-scripts` aprovada: 463 pacotes instalados,
464 auditados, zero vulnerabilidades reportadas. O lockfile perdeu 43 nós sem
adicionar pacotes ou alterar versão, resolução e integridade de nenhum nó
restante. Avisos preexistentes de peers Better Auth e deprecações transitivas
permanecem separados; nenhuma atualização de autenticação foi feita.

492 testes aprovados na instalação final, incluindo contratos de autenticação,
RBAC, FIFO, precisão e o loader Drizzle corrigido. Tipos, lint tipado e
formatação aprovados; `knip:check`: três conhecidos, zero novos/zero resolvidos.
Nenhum teste foi alterado ou removido. Build isolado e scans remotos desta
revisão serão conferidos no commit publicado; evidências anteriores estão
identificadas como históricas abaixo.

### Inventário completo da triagem

| Arquivo | Tipo Knip | Símbolo/referência | Decisão |
| --- | --- | --- | --- |
| `package.json` | dependencies | `@tanstack/react-devtools` | Removida dependência direta sem uso; lockfile reconciliado |
| `package.json` | dependencies | `@tanstack/react-form` | Removida dependência direta sem uso; lockfile reconciliado |
| `package.json` | dependencies | `@tanstack/react-router-devtools` | Removida dependência direta sem uso; lockfile reconciliado |
| `package.json` | dependencies | `class-variance-authority` | Removida dependência direta sem uso; lockfile reconciliado |
| `package.json` | dependencies | `clsx` | Removida dependência direta sem uso; lockfile reconciliado |
| `package.json` | dependencies | `radix-ui` | Removida dependência direta sem uso; lockfile reconciliado |
| `package.json` | dependencies | `tailwind-merge` | Removida dependência direta sem uso; lockfile reconciliado |
| `package.json` | dependencies | `tw-animate-css` | Mantido com justificativa na baseline contextual |
| `src/components/Header.tsx` | files | `src/components/Header.tsx` | Removido: sem consumidores nas rotas, testes ou scripts |
| `src/components/ui/button.tsx` | files | `src/components/ui/button.tsx` | Removido: sem consumidores nas rotas, testes ou scripts |
| `src/components/ui/input.tsx` | files | `src/components/ui/input.tsx` | Removido: sem consumidores nas rotas, testes ou scripts |
| `src/components/ui/label.tsx` | files | `src/components/ui/label.tsx` | Removido: sem consumidores nas rotas, testes ou scripts |
| `src/components/ui/select.tsx` | files | `src/components/ui/select.tsx` | Removido: sem consumidores nas rotas, testes ou scripts |
| `src/components/ui/slider.tsx` | files | `src/components/ui/slider.tsx` | Removido: sem consumidores nas rotas, testes ou scripts |
| `src/components/ui/switch.tsx` | files | `src/components/ui/switch.tsx` | Removido: sem consumidores nas rotas, testes ou scripts |
| `src/components/ui/textarea.tsx` | files | `src/components/ui/textarea.tsx` | Removido: sem consumidores nas rotas, testes ou scripts |
| `src/features/auth/audit.ts` | exports | `authAuditActions` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/auth/auth-audit-telemetry.server.ts` | types | `AuthAuditTelemetryEvent` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/auth/authorization.ts` | exports | `permissions` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/auth/cloudflare-rate-limit.server.ts` | unlisted | `cloudflare` | Mantido com justificativa na baseline contextual |
| `src/features/auth/external-contracts.ts` | types | `PasswordResetCompletion` | Declaração removida: nenhum uso interno ou externo |
| `src/features/auth/external-contracts.ts` | types | `PasswordResetDispatcher` | Declaração removida: nenhum uso interno ou externo |
| `src/features/auth/login-actions.ts` | exports | `invalidSignUpMessage` | Declaração removida: nenhum uso interno ou externo |
| `src/features/auth/neon-password-reset-provider.server.ts` | exports | `passwordResetProviderTimeoutMs` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/auth/neon-password-reset-provider.server.ts` | types | `PasswordResetProviderReasonCode` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/auth/neon-password-reset-provider.server.ts` | types | `PasswordResetRequestBindings` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/auth/password-reset-audit.ts` | types | `PasswordResetAuditAction` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/auth/password-reset-telemetry.server.ts` | exports | `passwordResetTelemetryStages` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/auth/password-reset-telemetry.server.ts` | types | `PasswordResetTelemetryStage` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/auth/principal-resolver.server.ts` | exports | `createConfiguredPrincipalResolver` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/auth/principal.ts` | exports | `assertAuthenticated` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/auth/principal.ts` | exports | `assertVerifiedPrincipal` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/auth/principal.ts` | exports | `isAuthorizationError` | Declaração removida: nenhum uso interno ou externo |
| `src/features/catalog/catalog.ts` | files | `src/features/catalog/catalog.ts` | Removido: sem consumidores nas rotas, testes ou scripts |
| `src/features/finance/contracts.ts` | types | `FinancialOverviewInput` | Declaração removida: nenhum uso interno ou externo |
| `src/features/inventory/fifo-migration-audit.ts` | exports | `positiveAdjustmentG6Prefix` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/inventory/fifo.ts` | types | `InventoryCostAllocation` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/inventory/lifecycle-writers.ts` | exports | `assertFifoLifecycleSchema` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/inventory/lifecycle.ts` | types | `LifecycleEvent` | Declaração removida: nenhum uso interno ou externo |
| `src/features/management/settings.ts` | exports | `parseUnsignedDecimal` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/operations/revenue-audit.ts` | exports | `revenueAuditStatuses` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/operations/revenue-audit.ts` | types | `RevenueAuditStatus` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/production/calculations.ts` | exports | `divideQuantities` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/production/calculations.ts` | exports | `normalizeDecimal` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/scenarios/contracts.ts` | exports | `scenarioMixValues` | Tornado interno: implementação/tipo preservado, somente export retirado |
| `src/features/scenarios/contracts.ts` | types | `ScenarioMixInput` | Declaração removida: nenhum uso interno ou externo |
| `src/lib/utils.ts` | files | `src/lib/utils.ts` | Removido: sem consumidores nas rotas, testes ou scripts |
| `test/security-dependencies.test.ts` | unlisted | `@esbuild-kit/core-utils` | Mantido com justificativa na baseline contextual |

`scripts/check-knip.mjs` normaliza por arquivo/tipo/nome, sem números de linha.
Achado novo bloqueia a CI. Achado resolvido também exige remover sua entrada
da baseline, para não permitir que ele retorne silenciosamente. Mudanças na
baseline exigem revisão de diff e justificativa. O gate rejeita falha de
execução, timeout, versão inesperada, JSON inválido e campos desconhecidos;
um crash do Knip nunca é convertido em sucesso. Não existe comando de
atualização automática da baseline.

## CodeQL

`.github/workflows/codeql.yml` usa CodeQL Action v4 em três análises:

- `javascript-typescript`: aplicação, configurações, scripts JS/TS, testes e E2E;
- `python`: scripts auxiliares, prévias e memória operacional em código;
- `actions`: workflows GitHub Actions, inclusive riscos de execução de shell
  nesses workflows.

As consultas são `security-extended`, com `build-mode: none`: não executam
build da aplicação, importações de dados, migrações, login ou testes em HML.
Não há `npm ci` nem secrets no workflow CodeQL. A matriz usa `fail-fast: false`,
categorias SARIF por linguagem e token mínimo `contents: read` / job
`security-events: write`; não usa `pull_request_target`.

Gatilhos: PR para main, push para main/branches de trabalho, execução manual e
segunda-feira às 06:31 UTC. A agenda só passa a executar quando o workflow
estiver integrado à branch padrão. A configuração exclui somente dependências,
artefatos gerados, caches, relatórios e estado local; não exclui áreas do domínio,
scripts auxiliares ou testes.

Knip não analisa Python/SQL/shell como código próprio. CodeQL cobre as três
linguagens acima, não scripts shell independentes ou SQL/migrations como uma
linguagem de análise. As provas PostgreSQL, testes de domínio e checagens dos
scripts continuam necessários. Job CodeQL aprovado comprova execução/análise;
os alertas enviados ao Code Scanning ainda precisam de triagem.

## Integração e validação iniciais (histórico)

Este pacote reconcilia a proposta da PR #45 com a branch TypeScript 7/Oxc,
sem copiar suas configurações reduzidas nem reintroduzir scripts alternativos
`lint:ox`/`format:ox:*`. Knip está no lockfile; CodeQL agora cobre também Python
e Actions. Não foi feito merge da PR #45 nem da main.

Instalação limpa `npm ci` passou, com zero vulnerabilidades. O lockfile preserva
versão, resolução e integridade de todos os pacotes anteriores; os novos nós
pertencem à adição do Knip e sua árvore, incluindo binários opcionais por plataforma.
Os avisos de peers Better Auth preexistentes continuam fora do escopo; nenhuma
versão de autenticação foi atualizada para eliminá-los.

Primeira execução publicada em `9144f99`:
[CI 39087671208](https://github.com/naiguelcabral/seus-brownies/actions/runs/39087671208)
e [CodeQL 39087671218](https://github.com/naiguelcabral/seus-brownies/actions/runs/39087671218)
aprovados. Upload ao Code Scanning confirmado pela API: 103 regras JS/TS,
50 Python e 23 Actions; Python/Actions sem resultados e oito resultados JS/TS.

Os oito alertas iniciais eram quatro criações previsíveis de arquivo temporário
nos scripts PostgreSQL descartáveis, três pares stat/leitura por caminho nos
testes de memória e uma construção de regex no contrato de URL HML. Preparada
correção sem ignorar queries/arquivos nem remover testes: diretórios `mkdtemp`,
arquivos 0600/exclusivos, leitura e verificação pelo mesmo descritor com
`O_NOFOLLOW`, comparação literal da URL. Coleta de artefatos sintéticos da CI
ajustada para os diretórios exclusivos. A reanálise e o teste PostgreSQL
descartável foram executados conforme o checkpoint final abaixo.

Os runners avisaram depreciação do runtime Node 20 interno de Actions v4 e
migração futura de `ubuntu-latest`. Isso é separado do Node 22 da aplicação;
atualizar Actions/imagem exige revisão própria e não foi misturado neste pacote.

Tipos, lint e formatação aprovados; gate Knip aprovado com 48 achados conhecidos,
zero novos e zero resolvidos. Os testes da integração verificam detecção real,
recusa de relatórios inválidos e regressão da baseline. Suíte: 492 testes
aprovados após remediação, mais os dois testes direcionados da comparação final
de URL. Build HML isolado local aprovado em `9144f99`; CI remota do código final
`a96a0f9` passou com build isolado e todos os gates. O CLI CodeQL não está
instalado localmente; a análise real foi executada no GitHub.

### Resultado publicado da integração inicial

- [CI 39088191790](https://github.com/naiguelcabral/seus-brownies/actions/runs/39088191790): sucesso em `a96a0f9`.
- [CodeQL 39088191746](https://github.com/naiguelcabral/seus-brownies/actions/runs/39088191746): três jobs aprovados; API confirmou zero resultados em JS/TS, Python e Actions, e zero alertas abertos na branch em `2026-10-18T01:56:25Z`.
- Análises Code Scanning `1974474017` (JS/TS, 103 regras), `1974473250`
  (Python, 50 regras) e `1974473163` (Actions, 23 regras), sem erro de análise.
- [PostgreSQL descartável 39088137292](https://github.com/naiguelcabral/seus-brownies/actions/runs/39088137292): sucesso em `dd5110c`, cujos scripts de evidência são idênticos aos de `a96a0f9`. Os três comandos descartáveis passaram e os 17 arquivos foram coletados no artefato `migration-chain-synthetic-evidence` (152763 bytes).

A primeira troca de regex por substring provocou um alerta adicional no teste;
a versão final extrai as URLs da configuração, exige lista exata e compara a
origem por `new URL`. Nenhum alerta foi fechado manualmente para simular
correção. Zero resultados é o resultado destas queries neste commit, não uma
garantia geral de ausência de vulnerabilidades. As 48 ocorrências iniciais do
Knip foram triadas na revisão acima; a baseline atual contém apenas três
referências contextuais justificadas.

## Próximas ações

1. Integrar o pacote validado após revisão; scans desta branch já estão conferidos.
2. Manter triagem de novos alertas Code Scanning por linguagem e registrar
   correções ou falsos positivos com evidência, sem concluir segurança pelo job verde.
3. Manter as três justificativas contextuais sob revisão quando seus
   consumidores ou dependências transitivas mudarem; as 48 ocorrências iniciais
   estão classificadas e as 45 correções foram preparadas.
4. Reconciliar a main e a PR #45 para evitar dois workflows ou perfis concorrentes.
   Merge continua sendo gate humano; nenhuma publicação de aplicação decorre disso.

Referências: [configuração Knip](https://knip.dev/reference/configuration),
[plugins e avaliação de configurações](https://knip.dev/explanations/plugins),
[configuração avançada CodeQL](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configuring-advanced-setup-for-code-scanning),
[linguagens CodeQL](https://docs.github.com/en/enterprise-cloud%40latest/code-security/tutorials/customize-code-scanning/prepare-code-for-analysis).
