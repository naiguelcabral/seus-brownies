# Plano de reconciliação WP-D após a paridade

Atualizado em 7 de outubro de 2026. A reconciliação foi integrada pela PR #12
no merge commit `4590ca4e235f540d6552ab499e1140434355ce1f`. A branch
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

O merge foi feito sem rebase ou force-push e preservou a branch de origem. Os
gates locais passaram: 371 testes, lint, typecheck, Prettier direcionado, diff
check e builds isolados de CI/HML com chave pública sintética. A CI pós-merge
da `main` (`37671827440`) aprovou testes, lint, typecheck e o build isolado
apropriado. SQL sem parser Prettier e snapshots Drizzle gerados ficam fora
apenas da checagem de formato:

```bash
git fetch origin --prune
git worktree add -b codex/wp-d-main-reconciliation /tmp/cacau-wp-d-main-reconciliation origin/main
git -C /tmp/cacau-wp-d-main-reconciliation merge --no-edit origin/codex/wp-d-scenarios
```

As migrations `0027` e `0028` permanecem somente versionadas e revisadas;
não foram aplicadas. O próximo gate humano é autorizar aplicação em HML com
backup, janela e rollback, seguida da homologação por navegador de Dono,
Gerente, Funcionário e negações por papel. Decisões de negócio permanecem
humanas. A PR #5 permanece congelada e não deve ser retargetada, fechada ou
alterada.
