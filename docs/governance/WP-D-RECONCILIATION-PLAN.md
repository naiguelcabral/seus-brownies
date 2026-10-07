# Plano de reconciliação WP-D após a paridade

Atualizado em 6 de outubro de 2026. A reconciliação está em execução na branch
`codex/wp-d-main-reconciliation`, criada da `main`
`51f9657938d2b168c963341c6246a625514dd8a8`. A origem congelada continua
`origin/codex/wp-d-scenarios` (`c54f65bfa49607793b4d5e5eec7369585e42c6d3`);
ela foi incorporada sem rebase pelo merge `f155b94`. A PR #5 não é modificada.

## Base comparada

A comparação agora é entre a origem congelada e a `main` pós-PR #11. WP-D acrescenta as
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
| Documentação de governança           | conflitos ocorridos em status, handoff e fila                 | `main` preservada como autoridade; registrar somente fatos WP-D confirmados                                     |
| `src/db/schema.ts` e journal Drizzle | soma aditiva após `0026`; risco de contexto se a main avançar | confirmar que `0027`/`0028` vêm imediatamente após a migração já integrada; nunca renumerar/aplicar             |
| autorização, navegação e route tree  | alterações paralelas em políticas e links                     | manter a matriz RBAC atual da main e garantir que `/cenarios` continue protegido no servidor e na UI            |
| relatórios/financeiro                | WP-D consome contratos G2, não deve reimplementar fatos       | preservar entrega, competência, caixa, CMV e reconciliação já integrados; testar realizado e projeção separados |
| testes                               | precisam refletir base recém-integrada                        | repetir suíte completa, lint, typecheck, Prettier dos arquivos alterados, diff check e build isolado            |

## Próxima branch e comando

O merge já foi feito sem rebase ou force-push. Depois dos gates locais, abrir
uma PR em rascunho desta branch contra `main`; não integrar automaticamente:

```bash
git fetch origin --prune
git worktree add -b codex/wp-d-main-reconciliation /tmp/cacau-wp-d-main-reconciliation origin/main
git -C /tmp/cacau-wp-d-main-reconciliation merge --no-edit origin/codex/wp-d-scenarios
```

As migrations `0027` e `0028` serão somente versionadas e revisadas; nunca
aplicadas nesta preparação. Antes de abrir a PR resultante, confirmar
conflitos, migrations, autorização, financeiro, reconciliação e a suíte
completa. Homologação HML, aplicação de schema e decisões de negócio permanecem
gates humanos. A PR #5 permanece congelada e não deve ser retargetada, fechada
ou alterada.
