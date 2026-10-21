# Atualizações de linguagens, ferramentas e procedimentos

> **Registro histórico, não é uma fila ativa.** Consolidado em 19/10/2026 no
> [roadmap único](ROADMAP-CODEX.md). As pendências e contagens abaixo retratam
> a data da análise; não reabrem entregas comprovadas posteriormente.

Registro histórico do diagnóstico anterior à integração Knip/CodeQL.
A implantação das ferramentas e a revisão das 48 ocorrências estão em
[KNIP-CODEQL.md](KNIP-CODEQL.md); consulte o
[estado canônico](PROJECT-STATUS.md) para a situação atual. As linhas
“ausente” e a fila abaixo descrevem o checkpoint original, não pendências atuais.

Verificação em 17 de outubro de 2026 (consulta remota em 18/10 UTC).
Base local inspecionada: `776b669`, branch `codex/worker-sql-connection-check`.
`git fetch origin` confirmou `origin/main` em `32a9e11`.
Este registro compara o que foi implementado e integrado; não é uma lista das
versões mais recentes disponíveis no mercado nem autorização de upgrade.

## Linguagens e ferramentas

| Área | Estado verificado nesta branch | O que falta |
| --- | --- | --- |
| TypeScript | 7.0.2 fixado em dependência e override; apenas uma versão em `npm ls typescript --all`; contratos estritos ativos | Revisar e integrar o pacote `23f9d85` e as melhorias `072cea1` na main; CI sobre o resultado reconciliado |
| JavaScript / Node | ESM, alvo ES2022; Node 22.23.2 em `.nvmrc`; engines `>=22.12.0 <23`; CI usa `.nvmrc` | Manter alinhamento em qualquer atualização futura; não foi aprovada troca de major do runtime nem mudança do alvo |
| React / TanStack | React/DOM 19.3.1; Start 1.169.3; Router 1.170.45 no manifesto local; pacotes críticos com versões explícitas | Integrar o pacote de segurança `201a1ee` e validar navegação, sessão, OTP/reset e fluxo protegido no ambiente publicado |
| Lint | Oxlint 1.88.0 + oxlint-tsgolint 7.0.2004; lint tipado bloqueia avisos, Hooks, promises e regras React/ARIA | Preservar esta configuração ao reconciliar a PR #45; não trocar pelo perfil informativo reduzido |
| Formatação | Oxfmt 0.73.0 nos scripts; extensão Oxc configurada no VS Code; escopo explícito | Atualizar a orientação do piloto que ainda exige Prettier; confirmar extensão instalada no editor humano |
| Parser de testes | oxc-parser/oxc-transform 0.154.0; teste do login executa callback real extraído por AST | Preservar o contrato durante a integração; não reintroduzir a API TypeScript 6 |
| Python auxiliar | `python3` local 3.14.4; prévias/importações auxiliares usam Python, sem virar backend | Declarar versão suportada e fixar/validar o runtime na CI; hoje a CI não possui `setup-python` explícito |
| PostgreSQL / SQL | Provas descartáveis usam PostgreSQL 17; original atualizada até 0028 sob plano específico | Resolver separadamente a cadeia geral de migrations para outras bases; atualização da original não libera instalação/migration genérica |
| Knip | Ausente desta branch; proposto na PR #45, versão 6.41.0 via npm exec | Reconciliar e incorporar como dependência fixada com lockfile, executar sobre a branch final e triar achados antes de remover código |
| CodeQL | Workflow ausente desta branch/main; execução da PR #45 aprovada | Integrar workflow e verificar resultados/alertas do Code Scanning sobre o commit final; job verde não demonstra zero alertas |

`npm ls` confirmou ausência de ESLint instalado. Prettier ainda é dependência
transitiva de Neon/TanStack; não é o formatador dos comandos locais e sua
presença interna não significa migração incompleta.

`npm audit --json` atualizado retornou **zero vulnerabilidades** neste lockfile.
Primeira tentativa foi bloqueada por DNS no sandbox; consulta autorizada fora
do sandbox concluiu com código 0. Isso não audita a main antiga ou a futura
combinação com a PR #45, nem substitui revisão de código/segurança.

## Integração remota

A main remota ainda declara TypeScript `^6.0.2`, ESLint e Prettier. Os commits
`23f9d85`, `201a1ee` e `072cea1` não são ancestrais de `origin/main`.
Há 41 commits locais à frente da main no checkpoint inspecionado; o conjunto
inclui reparos e evidências operacionais além de tooling. A integração exige
revisão de escopo, sem merge automático de todo o histórico por inferência.

[PR #45](https://github.com/naiguelcabral/seus-brownies/pull/45), HEAD `2fa511b`:
aberta, checks de CI, CodeQL e Tooling Preview aprovados. O
[preview 39080830716](https://github.com/naiguelcabral/seus-brownies/actions/runs/39080830716)
mostra os três passos Oxlint/Oxfmt/Knip como `success`, não apenas o job geral.
O workflow usa `continue-on-error`; futuras execuções devem conferir os passos.

Essa PR foi construída sobre a main antiga: preserva ESLint/Prettier e adiciona
`lint:ox`/`format:ox:*` informativos. A configuração Oxlint contém somente as
categorias correctness/suspicious como avisos; não equivale à configuração
tipada desta branch. Oxfmt também tem escopo/ignores diferentes. Reconciliar
os dois trabalhos antes de integrar, manter lint/check atuais como gates e
aproveitar Knip/CodeQL sem remover regras nem voltar a formatar artefatos
históricos. A PR não altera o lockfile: as ferramentas usam `npm exec` com
versão fixa, ainda dependente de download no momento da execução.

A última CI remota da branch atual corresponde a `48b101d`,
[run 39064237165](https://github.com/naiguelcabral/seus-brownies/actions/runs/39064237165),
anterior ao cadastro e à correção de sessão. Os 489 testes e o build HML
isolado de `899f7ec` são evidência local; falta CI remota do código final.

## Procedimentos corrigidos/documentados nesta revisão

- README passa a apontar para a governança atual e identifica como históricos
  os relatos de importação em development, evitando presumir dados na original.
- Workflow e Definition of Done explicitam build isolado. O comando `build`
  interno continua existindo, mas não é o procedimento de validação do agente
  em um checkout com arquivos locais de ambiente.
- O relatório antigo `docs/STATUS-PROJETO.md` fica marcado como histórico.
- Registros de autorização, catálogo e sessão mantêm referências aos recibos
  já gravados; nada foi reimportado ou publicado nesta revisão.

## Fila recomendada

1. Obter autorização específica para publicar a correção de sessão
   `899f7ec` em HML e validar login → Estoque → recarga com a sessão humana.
   Há erro 429 comprovado no provedor; reduzir consultas não prova eliminação
   de toda a origem do limite. [Incidente](AUTH-SESSION-THROTTLING-2026-10-17.md).
2. Reconciliar a atualização TypeScript/Oxc/segurança com a main e a PR #45,
   preservar regras estritas e produzir CI remota do resultado final.
3. Incorporar Knip com manifesto/lockfile consistentes e CodeQL; triar os
   resultados no commit final antes de promover novos gates ou apagar código.
4. Atualizar `validation_policy_for` em `scripts/codex-autopilot.sh`, ainda
   com instrução ativa de Prettier, e sincronizar a matriz do
   [runbook](AUTONOMY-RUNBOOK.md). Validar os testes do controlador; não alterar
   retrospectivamente recibos históricos que mencionam Prettier.
5. Declarar e testar a versão Python suportada; confirmar setup da extensão Oxc
   no editor humano. Não instalar ou alterar automaticamente nesta revisão.
6. Reconciliar insumos/receita/perfis e somente depois homologar a operação
   estoque → produção → venda sob autorização própria. A base atual tem os
   17 produtos finais, mas não tem insumos, receitas, perfis nem estoque.
7. Fechar a estratégia auditável da cadeia de migrations para novas bases,
   mantendo o preflight bloqueante até haver evidências para o destino correto.

## Limites e validação

Esta revisão é documental: consultas Git/GitHub, configuração, árvore instalada,
auditoria npm e evidências da sessão anterior. Não reinstalou dependências,
não modificou código do piloto, não atualizou versões, não fez merge/deploy e
não acessou arquivos de ambiente. As validações anteriores continuam datadas:
489 testes, tipos, lint, check e build HML isolado; não foram repetidas por
mudanças apenas em Markdown. Conferidos 52 links locais em oito documentos,
sem destino ausente; `git diff --check` aprovado.
