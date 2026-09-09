# Análise de integração das PRs #2 e #3

Atualizada em 9 de setembro de 2026. Esta análise é somente leitura; não muda
bases, commits, status ou ordem de merge.

## Relação confirmada

| PR  | Base          | Head                                         | Relação                                                                                                 |
| --- | ------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| #2  | `g1-auth-adr` | `feat/codex-conversation-memory` (`c8f899f`) | memória local de conversas sobre a fundação G1                                                          |
| #3  | `main`        | `codex/audit-remediation`                    | contém `c8f899f` como ancestral e acrescenta remediações de segurança, auth, operações, CI e governança |

As duas bases descendem de `main` em `daa318c`. O merge-base entre os heads
das PRs é exatamente `c8f899f`: não há commit exclusivo de #2 ausente em #3.
Assim, #3 já transporta a implementação e a documentação da memória local que
a #2 propõe para `g1-auth-adr`.

## Sobreposição e risco

A sobreposição inclui governança, `.gitignore`, scripts de memória local,
testes de sanitização, CI, build e módulos G1. A PR #3 também inclui migrations
aditivas ainda não aplicadas, correções FIFO e mudanças operacionais que não
pertencem à #2. Revisar ou integrar #3 antes de resolver a linhagem G1 torna
difícil separar a revisão da memória local das demais remediações.

Não há conflito textual conhecido, mas há risco de revisão e histórico
duplicados. Integrar #2 em `g1-auth-adr` depois de #3 em `main` mantém duas
linhas com o mesmo conteúdo até que G1 também seja integrado a `main`.

## Recomendação de ordem

1. Revisar e, se aprovada, integrar #2 em `g1-auth-adr`, preservando seu
   escopo restrito de memória local.
2. Preparar uma integração revisável de `g1-auth-adr` para `main`.
3. Só então revisar #3 contra a `main` atualizada. O Git eliminará do diff os
   commits já ancestrais, sem rebase destrutivo da #3.

Se a equipe optar por integrar #3 primeiro, a #2 deve permanecer como trabalho
de G1 até uma decisão explícita sobre sua manutenção; não deve ser mesclada
apenas para fechar duplicidade. Não alterar bases nem executar merge/rebase
sem nova autorização humana.
