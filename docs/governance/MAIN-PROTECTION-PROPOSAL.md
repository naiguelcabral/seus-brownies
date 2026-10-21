# Proposta de proteção da main — G03

Preparada em 21/10/2026; **não aplicada**. O roadmap continua como fila única.
A API da main `b82e044` retornou `protected:false` e nenhum ruleset. Payload
revisável em [main-branch-protection.json](proposals/main-branch-protection.json).

## Comportamento proposto

Exigir PR, branch atualizada, resolução de conversas e os sete checks sempre
executados: `verify`, `business-postgres`, `browser-fixtures`,
`connected-postgres-browser` e `Analyze (javascript-typescript|python|actions)`.
Nomes e GitHub Actions app ID 15368 conferidos nos check runs de `b82e044`.
Aplicar também a administradores; bloquear force push e exclusão da main.
Histórico com merge commits continua permitido.

Os workflows de migrations/evidência têm filtros de paths e não são checks
obrigatórios globais nesta proposta: exigir um check que não é criado em
toda PR pode impedir integrações documentais. Para mudanças de migrations,
seus testes e gates específicos continuam obrigatórios pelo workflow/DoD.

## Decisão administrativa final

O payload contempla um mantenedor: exige PR e checks, com zero aprovações
formais. O Dono ainda deve revisar e autorizar merge conforme a governança;
zero aprovações no GitHub não delega essa decisão ao agente. GitHub não aceita
que o autor aprove a própria PR. Se existir outro revisor habilitado, mudar
`required_approving_review_count` para 1 antes da aplicação.

Confirmar: número de revisores, política de exceções/emergências e acesso
administrativo disponível. A proposta não concede bypass. Não executar PUT
nem alterar ruleset antes dessa decisão; não desligar proteção para resolver
uma CI vermelha. Após autorização, reler proteção/rulesets, aplicar a política
escolhida e conferir readback e uma PR real. Não inventar uma prova de
bloqueio com escrita na main.

Referências: [API de branch protection](https://docs.github.com/en/rest/branches/branch-protection#update-branch-protection)
e [checks obrigatórios](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging).
