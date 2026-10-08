# Reconciliação de integração — PRs #12–#30

Data da revalidação remota: 8 de outubro de 2026. Fonte de estado: GitHub
MCP autenticado, seguida de `git fetch origin --prune`. A `main` remota era
`f61e9a28df7b0fdbc80864402b578a2a0aabd3f8`. Todas as PRs abertas tinham essa
mesma base e cada head era descendente direto dela. Nenhuma migration foi
aplicada, nenhum banco, deploy, secret, binding ou ambiente compartilhado foi
alterado.

## Critérios da reconciliação

- Cada item foi revisado quanto a segredos, arquivos de ambiente, dados reais,
  infraestrutura, escrita compartilhada, precisão monetária e controles
  server-side.
- `migrations` informa arquivos alterados pela PR. A ausência significa que o
  diff da PR não contém migration; migrations já versionadas seguem sem
  aplicação.
- A decisão `lote` significa inclusão em uma nova branch de integração, por
  merge commit local e testes no SHA consolidado. `separada` preserva uma PR
  para revisão humana individual. `bloqueada` não é incluída.

## Matriz

| PR | Head remoto / CI do head | Escopo, arquivos e migrations | Sobreposição, risco e ordem | Decisão |
| --- | --- | --- | --- | --- |
| #12 | `9881cfe`; sucesso `37656156903` | WP-D; já em `main` pelo merge `4590ca4`. Sem migration nova nesta PR; `0027/0028` permanecem versionadas. | Histórico consolidado; não reaplicar. | **já integrada** |
| #13 | `1922bae`; sucesso `37698011783` | Loader persistente de credencial GitHub MCP: `LIGARTUDO`, scripts `codex/`, teste e docs. Sem migration. | Token chega ao processo Codex de longa duração e pode ser herdado por subprocessos; o diff não contém valor de PAT, mas esse limite precisa de revisão humana. | **bloqueada — CHANGES-REQUIRED** |
| #14 | `58824df`; sucesso `37774726015` | Reconciliação documental: status, fila, handoff, log, roadmap e relatório de rodada. Sem migration. | Sobrepõe todos os documentos de governança; aplicar após lotes ou ajustar para refletir os lotes. | separada, lote governança |
| #15 | `36b2fef`; sucesso `37700505229` | Diagnóstico FIFO somente leitura: `inventory-reconciliation` e teste. Sem migration. | Complementa #30; não escreve nem corrige estoque/CMV. Ordem 1 do lote financeiro. | lote financeiro |
| #16 | `677bccd`; sucesso `37700972317` | Tendências operacionais: função protegida, comparação de período, rota de relatórios e teste. Sem migration. | Conflita em imports/documentos com #17/#18; resolução mecânica mantém consultas protegidas. Ordem 2. | lote financeiro |
| #17 | `9afe969`; sucesso `37701341356` | Top produtos: cálculo exato, função/rota de relatórios e teste. Sem migration. | Mesmo endpoint/UI de #16/#18; sem nova regra financeira. Ordem 3. | lote financeiro |
| #18 | `40f433b`; sucesso `37762373436` | Perdas declaradas e coprodutos: agregador, função/rota de relatórios e teste. Sem migration. | Mesmo imports/UI de #16/#17; resolução preserva ambos os agregadores. Ordem 4. | lote financeiro |
| #19 | `a576b4c`; sucesso `37762731976` | Rendimento por lote: produção, rota e teste. Sem migration. | Compartilha rota de produção com #20/#26; calcular localmente, sem writer. | lote produção |
| #20 | `b90a36b`; sucesso `37763029556` | Alertas de insumo insuficiente: módulo, rota e teste. Sem migration. | Mesma rota de #19/#26; manter proteção e apenas leitura. | lote produção |
| #21 | `413633d`; sucesso `37763964658` | Telemetria de auth e `request_id`, testes. Sem migration. | Área de segurança; revisar sanitização e RBAC no lote plataforma. | lote plataforma |
| #22 | `398998f`; sucesso `37764300062` | Memória de conversa local e teste. Sem migration. | Script local, sem runtime/infraestrutura; verificar exclusão de conteúdo sensível. | lote plataforma |
| #23 | `3419f05`; sucesso `37764843241` | Continuidade do autopilot, fila/runbook e teste. Sem migration. | Governança e script; revisar que blockers não removem gates. | lote plataforma |
| #24 | `6f6dcee`; sucesso `37765117144` | Checklist de readiness de produção e documentação. Sem migration. | Somente docs; conflita apenas em registros de governança. | lote produção |
| #25 | `ecdd3a9`; sucesso `37765656425` | Matriz de ambientes e docs. Sem migration. | Somente docs; não altera configurações ou secrets. | lote plataforma |
| #26 | `c4a5ba4`; sucesso `37766351915` | Reconciliação de custo de produção: módulo, função/rota e teste. Sem migration. | Compartilha função/rota com #19/#20/#27; exige preservar BigInt/decimal e apenas SELECT. | lote produção |
| #27 | `394947a`; sucesso `37767170223` | Invariantes do writer de produção e helper/teste. Sem migration. | Compartilha `production/functions`; requer revisão dos guards transacionais. | lote produção |
| #28 | `9a8e7ea`; sucesso `37767637508` | Runbook de resiliência e sinais locais, teste. Sem migration. | Sem infraestrutura externa; compatível com plataforma. | lote plataforma |
| #29 | `bed1afe`; sucesso `37773346421` | Smoke público local: Playwright, script e docs/teste. Sem migration. | Requer somente host/browser se executado; não iniciar cenário HML. | lote plataforma |
| #30 | `c24f5f4`; sucesso `37773969240` | Cobertura entrega × FIFO: diagnóstico puro, função/rota financeira e teste. Sem migration. | Complementa #15; não muda CMV. Referência correta: `codex/auto-a28-delivery-fifo-coverage`. Ordem 5. | lote financeiro |

## Lotes propostos

1. **Financeiro e relatórios**: #15, #16, #17, #18 e #30. Branch
   `codex/integration-reports-finance`. Conflitos documentais e de imports
   resolvidos por composição: cada agregador permanece disponível; nenhuma
   consulta foi desprotegida. Este é o lote desta PR de integração.
2. **Produção e readiness**: #19, #20, #24, #26 e #27. Branch nova, somente
   depois de finalizar a validação do primeiro lote. Conflitos esperados nas
   funções/rota de produção devem preservar writers e invariantes.
3. **Plataforma e governança**: #14, #21, #22, #23, #25, #28 e #29. Branch
   nova, independente dos outros lotes. Não executa browser/HML; revalida
   scripts e documentação.
4. **Credencial MCP**: #13 permanece fora. A revisão humana deve decidir se o
   token pode ser entregue ao processo persistente e aos seus filhos, ou pedir
   que o launcher limite o escopo da credencial ao transporte MCP.

## Conflitos resolvidos no lote financeiro

- #18 e #30 concorreram por `AUTONOMY-HANDOFF.md` e `AUTONOMY-LOG.md`.
  Foram preservados os registros de ambos, sem substituir evidência histórica.
- #18 concorreu pelos imports de `src/features/reports/functions.ts` com #16.
  Foram mantidos tanto `compareOperationalTotals`/`previousEqualLengthPeriod`
  quanto `summarizeCoProducts`/`summarizeDeclaredLosses`. As funções continuam
  usadas pelo endpoint com middleware existente.
- Nenhum conflito exigiu decisão de regra financeira, schema, RBAC ou dados.

## Evidência e próximos passos

Os checks acima pertencem aos heads individuais e servem somente como
inventário. O lote consolidado exige suas próprias verificações e CI no SHA da
branch de integração. A revisão humana deve avaliar os drafts resultantes e
decidir separadamente sobre a #13 e qualquer migration já versionada.
