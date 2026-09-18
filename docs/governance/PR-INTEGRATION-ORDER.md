# Ordem de integração das PRs #2 e #3

Atualizada em 17 de setembro de 2026 após a integração auditável de G1 na
`main` pelo merge `4e784dd06b3f9068949e0bd4505ed3c5aa99ff20`.

## Relação confirmada

| PR  | Base      | Head                                  | Relação                                                                                        |
| --- | --------- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| #2  | integrada | `feat/codex-conversation-memory`      | memória local endurecida integrada em G1 e depois em `main`                                    |
| #3  | `main`    | `codex/audit-remediation` (`241099a`) | remediações de segurança, auth, operações, CI, relatórios e governança sobre a linhagem antiga |

O hardening de memória, Turnstile e a fundação G1 agora são ancestrais da
`main`, mas não do head histórico da PR #3. A atualização deve entrar na branch
da PR #3 por uma PR estreita de reconciliação, preservando os dois pais de
merge e sem rebase, force-push ou cópia manual do hardening.

## Sobreposição e risco

A sobreposição inclui governança, `.gitignore`, scripts de memória local,
testes de sanitização, CI, build e módulos G1. A PR #3 também inclui migrations
aditivas ainda não aplicadas, correções FIFO e mudanças operacionais que não
pertencem à #2. Revisar ou integrar #3 antes de resolver a linhagem G1 torna
difícil separar a revisão da memória local das demais remediações.

Os conflitos conhecidos concentram-se em governança, `.gitignore`, scripts de
memória/autonomia, build HML e guards de caminhos. Segurança e G1 da `main` são
autoridade; recursos exclusivos e seguros da autonomia permanecem na PR #3.

## Recomendação de ordem

1. Revisar e integrar a PR estreita
   `codex/pr3-main-reconciliation` → `codex/audit-remediation`.
2. Revalidar a PR #3 já contendo a `main` pós-G1 e somente então decidir sua
   integração em `main`.
3. Após a PR #3, atualizar e revisar separadamente as PRs #4 e #5, que
   permanecem congeladas nesta etapa.
