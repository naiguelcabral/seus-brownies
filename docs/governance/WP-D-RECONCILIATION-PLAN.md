# Plano de reconciliação WP-D após a paridade

Atualizado em 5 de outubro de 2026. Esta é uma preparação técnica somente de
leitura; não abre PR duplicada nem modifica a PR #5
(`codex/wp-d-scenarios`, `c54f65b`).

## Base comparada

A comparação foi feita entre `origin/codex/wp-d-scenarios` e a nova branch
`codex/workbook-parity-main-reconciliation`, que parte da ponta da PR #4
(`e53d42d`) e incorporou `origin/main` por merge. WP-D acrescenta as
migrations aditivas `0027` e `0028`, as tabelas de cenário/mix/histórico,
Server Functions protegidas, rota `/cenarios` e seis testes de cenário.

## Compatibilidade confirmada

- Cenários possuem versões e histórico append-only; versões ativas/arquivadas
  não são reescritas.
- O mix guarda peso original e peso normalizado em pontos-base, com fechamento
  exato de 10.000 bps (100%); a correção do mix original de 103% preserva a
  evidência de origem.
- Projeções usam snapshots de preço/custo por cenário e são separadas dos fatos
  realizados. Não copiam totais históricos do workbook.
- RBAC está declarado nas permissões e no mapa de Server Functions; testes
  cobrem negações de Funcionário.
- Valores usam dinheiro decimal e inteiros de base para normalização, sem
  `Number` como persistência monetária.

## Conflitos e verificações previstas

| Área                                 | Situação prevista                                             | Ação na retomada                                                                                                |
| ------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Documentação de governança           | conflito provável por checkpoints posteriores da main         | preservar G1, CI, handoff e guard da main; reaplicar somente fatos WP-D verificados                             |
| `src/db/schema.ts` e journal Drizzle | soma aditiva após `0026`; risco de contexto se a main avançar | confirmar que `0027`/`0028` vêm imediatamente após a migração já integrada; nunca renumerar/aplicar             |
| autorização, navegação e route tree  | alterações paralelas em políticas e links                     | manter a matriz RBAC atual da main e garantir que `/cenarios` continue protegido no servidor e na UI            |
| relatórios/financeiro                | WP-D consome contratos G2, não deve reimplementar fatos       | preservar entrega, competência, caixa, CMV e reconciliação já integrados; testar realizado e projeção separados |
| testes                               | precisam refletir base recém-integrada                        | repetir suíte completa, lint, typecheck, Prettier dos arquivos alterados, diff check e build isolado            |

## Próxima branch e comando

Somente depois de revisão e merge humanos em ordem **PR #9 → PR de
reconciliação da paridade → WP-D**, criar uma branch nova a partir da `main`
atualizada e mesclar WP-D sem rebase:

```bash
git fetch origin --prune
git worktree add -b codex/wp-d-main-reconciliation /tmp/cacau-wp-d-main-reconciliation origin/main
git -C /tmp/cacau-wp-d-main-reconciliation merge --no-edit origin/codex/wp-d-scenarios
```

Antes de abrir a PR resultante, confirmar migrations, reexecutar os testes de
cenário, autorização, financeiro, reconciliação e a suíte completa. A PR #5
permanece congelada e não deve ser retargetada, fechada ou alterada.
