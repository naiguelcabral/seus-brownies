# Classificação da dívida de formatação

## Escopo e reprodução

Em 7 de setembro de 2026, `npm run check` executou somente
`prettier --check .`, terminou com código 1 e listou 103 caminhos fora do
formato. Não houve saída de carregamento de ambiente, rede ou outro efeito além
da checagem local. Esta classificação não reformata nenhum arquivo.

## Resumo

| Categoria                       | Arquivos | Recomendação mínima                                                                               |
| ------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| Fonte mantida                   |       39 | Dividir por domínio em pacotes pequenos de formatação com testes/lint aplicáveis.                 |
| Testes mantidos                 |       18 | Formatar junto do domínio correspondente, sem alterar comportamento ou snapshots.                 |
| Artefatos ou relatórios gerados |       37 | Excluir do check global ou definir política de geração/validação própria; não editar manualmente. |
| Documentação histórica          |        8 | Manter como evidência; corrigir apenas em pacote documental explicitamente aprovado.              |
| Outro                           |        1 | Formatar no próximo pacote que atualizar o próprio log de autonomia.                              |

## Fonte mantida (39)

Pacotes futuros devem separar essas correções por domínio; o menor ponto de
partida é um pacote exclusivo para configuração e utilitários, seguido por
inventário e rotas. Não aplicar uma reescrita global.

- `.cta.json`
- `.vscode/mcp.json`
- `AGENTS.md`
- `components.json`
- `data/importacao-compras-aliases.json`
- `data/receita-base-vinculos.json`
- `eslint.config.js`
- `prettier.config.js`
- `scripts/audit-fifo-lifecycle-runtime.ts`
- `scripts/backfill-hml-fifo.ts`
- `scripts/import_history.ts`
- `scripts/import_production.ts`
- `scripts/sync_production_profile_components.ts`
- `seus-brownies.code-workspace`
- `src/components/Header.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/slider.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/textarea.tsx`
- `src/features/inventory/fifo-migration-audit.ts`
- `src/features/inventory/fifo.ts`
- `src/features/inventory/hml-backfill.ts`
- `src/features/inventory/lifecycle-contracts.ts`
- `src/features/inventory/lifecycle-ui.ts`
- `src/features/inventory/lifecycle-writers.ts`
- `src/features/inventory/lifecycle.ts`
- `src/features/inventory/positive-adjustment-form.tsx`
- `src/features/production/identities.ts`
- `src/features/reports/calculations.ts`
- `src/lib/format.ts`
- `src/routes/estoque.tsx`
- `src/routes/fifo-migration-audit.tsx`
- `src/routes/producao.tsx`
- `src/routes/produtos.tsx`
- `src/routes/relatorios.tsx`
- `src/routes/vendas.tsx`
- `tsconfig.json`

## Testes mantidos (18)

Esses arquivos pertencem ao código de teste mantido. A formatação deve ocorrer
no mesmo pacote que o domínio correspondente, com os testes relevantes; não
tratar testes como artefatos descartáveis.

- `e2e/auditoria-lote.spec.ts`
- `e2e/fifo-g6-positive-adjustment-precheck.spec.ts`
- `e2e/fifo-g7-positive-adjustment.spec.ts`
- `e2e/fifo-lifecycle-scenarios.spec.ts`
- `e2e/fumaca-estoque.spec.ts`
- `e2e/fumaca-producao.spec.ts`
- `e2e/fumaca-vendas.spec.ts`
- `e2e/homologacao-producao.spec.ts`
- `e2e/prechecagem-estoque.spec.ts`
- `test/fifo-migration-audit.test.ts`
- `test/helpers/lifecycle-drizzle-mock.ts`
- `test/inventory-fifo.test.ts`
- `test/inventory-lifecycle-contracts.test.ts`
- `test/inventory-lifecycle-ui.test.ts`
- `test/inventory-lifecycle.test.ts`
- `test/lifecycle-writers.test.ts`
- `test/production-identities.test.ts`
- `test/report-calculations.test.ts`

## Artefatos ou relatórios gerados (37)

Não editar manualmente nem usar como alvo para deixar o check verde. A política
futura deve excluir esses diretórios do check global ou validar sua geração em
comando próprio; snapshots Drizzle precisam continuar versionados e revisados
como saída de migration, não como formatação em massa.

- `drizzle/meta/_journal.json`
- `drizzle/meta/0000_snapshot.json`
- `drizzle/meta/0001_snapshot.json`
- `drizzle/meta/0002_snapshot.json`
- `drizzle/meta/0003_snapshot.json`
- `drizzle/meta/0004_snapshot.json`
- `drizzle/meta/0005_snapshot.json`
- `drizzle/meta/0006_snapshot.json`
- `drizzle/meta/0007_snapshot.json`
- `drizzle/meta/0008_snapshot.json`
- `drizzle/meta/0009_snapshot.json`
- `drizzle/meta/0010_snapshot.json`
- `drizzle/meta/0011_snapshot.json`
- `drizzle/meta/0014_snapshot.json`
- `drizzle/meta/0015_snapshot.json`
- `drizzle/meta/0016_snapshot.json`
- `playwright-report/data/b76ecab0decfd3985fc9e31d7351a896ec6c7698.md`
- `playwright-report/index.html`
- `playwright-report/trace/assets/codeMirrorModule-rXmQmLUY.js`
- `playwright-report/trace/assets/defaultSettingsView-B-dXF5JN.js`
- `playwright-report/trace/assets/urlMatch-L3liM589.js`
- `playwright-report/trace/codeMirrorModule.-QdMvsKi.css`
- `playwright-report/trace/defaultSettingsView.BLFoOugd.css`
- `playwright-report/trace/index.B_TqY17P.css`
- `playwright-report/trace/index.html`
- `playwright-report/trace/index.KZ4wOW1K.js`
- `playwright-report/trace/manifest.webmanifest`
- `playwright-report/trace/snapshot.B_Jk1wbt.js`
- `playwright-report/trace/snapshot.html`
- `playwright-report/trace/sw.bundle.js`
- `playwright-report/trace/uiMode.C7UW1s9.css`
- `playwright-report/trace/uiMode.Dzuouizj.js`
- `playwright-report/trace/uiMode.html`
- `playwright-report/trace/xtermModule.kHJ-D0s7.css`
- `test-results/.last-run.json`
- `test-results/hml-venda-correcao/.last-run.json`
- `test-results/hml-venda-correcao/hml-sale-correction-regist-b8690--de-correcao-pela-interface/error-context.md`

## Documentação histórica (8)

Esses registros preservam importações, homologações ou decisões anteriores.
Continuam excluídos de qualquer pacote de formatação ampla; uma alteração só é
aceitável quando uma correção documental específica a exigir.

- `docs/ACESSO-E-ITENS-FUTUROS.md`
- `docs/FIFO-CMV-PRIMEIRA-ENTREGA.md`
- `docs/HOMOLOGACAO-FIFO-FASE-2.md`
- `docs/HOMOLOGACAO-HML-PRECISAO-MONETARIA.md`
- `docs/IMPORTACAO-HISTORICO-WORKBOOK-PREVIA.md`
- `docs/IMPORTACAO-PRODUCAO-WORKBOOK-PREVIA.md`
- `docs/IMPORTACAO-WORKBOOK-PREVIA.md`
- `docs/STATUS-PROJETO.md`

## Outro (1)

- `docs/governance/AUTONOMY-LOG.md` — log sanitizado e mantido, fora da dívida
  histórica. Pode ser formatado pontualmente ao registrar o próximo ciclo; não
  deve desbloquear um check global nesta etapa.
