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

## Baseline inicial: 48 ocorrências

| Tipo | Quantidade | Triagem inicial |
| --- | ---: | --- |
| Arquivos sem uso alcançável | 10 | Header, sete componentes UI, utilitário e catálogo estático antigo; preservar até revisão dos consumidores |
| Dependências sem uso alcançável | 8 | Ferramentas TanStack e dependências dos componentes órfãos; `tw-animate-css` é importado por CSS e precisa desse contexto |
| Exports candidatos | 16 | Incluem símbolos usados apenas internamente; revisar necessidade de export sem alterar regras do domínio |
| Tipos candidatos | 12 | Revisar contratos e consumidores antes de remover |
| Referências não declaradas | 2 | `cloudflare:workers` é módulo virtual do runtime; `@esbuild-kit/core-utils` é transitivo exercitado pelo teste de segurança |

Os nomes/arquivos completos ficam em `knip-baseline.json`. Essa lista registra
dívida e casos contextuais; não afirma 48 bugs nem autoriza exclusão automática.
Não há `--fix`, supressão ampla de dependências ou exclusão de domínio.

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

## Integração e validação

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
ajustada para os diretórios exclusivos. Reanálise e teste PostgreSQL descartável
são necessários para confirmar a remediação, não apenas job CodeQL verde.

Os runners avisaram depreciação do runtime Node 20 interno de Actions v4 e
migração futura de `ubuntu-latest`. Isso é separado do Node 22 da aplicação;
atualizar Actions/imagem exige revisão própria e não foi misturado neste pacote.

Tipos, lint e formatação aprovados; gate Knip aprovado com 48 achados conhecidos,
zero novos e zero resolvidos. Os testes da integração verificam detecção real,
recusa de relatórios inválidos e regressão da baseline. Build isolado, suíte
completa e execução GitHub do CodeQL ficam registrados no checkpoint canônico
após sua conclusão. O CLI CodeQL não está instalado localmente.

## Próximas ações

1. Conferir CI e as três análises CodeQL no commit publicado desta branch.
2. Revisar alertas do Code Scanning por linguagem e registrar correções ou
   falsos positivos com evidência, sem concluir segurança pelo job verde.
3. Triar a baseline Knip por grupos pequenos; somente então remover arquivos,
   exports ou dependências com os testes correspondentes.
4. Reconciliar a main e a PR #45 para evitar dois workflows ou perfis concorrentes.
   Merge continua sendo gate humano; nenhuma publicação de aplicação decorre disso.

Referências: [configuração Knip](https://knip.dev/reference/configuration),
[plugins e avaliação de configurações](https://knip.dev/explanations/plugins),
[configuração avançada CodeQL](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configuring-advanced-setup-for-code-scanning),
[linguagens CodeQL](https://docs.github.com/en/enterprise-cloud%40latest/code-security/tutorials/customize-code-scanning/prepare-code-for-analysis).
