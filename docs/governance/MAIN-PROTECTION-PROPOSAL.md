# Proteção da main — G03

Aplicada em 22/10/2026 por autorização do Dono. A ruleset ativa
`main-production-integration` (ID `25611109`) protege a branch padrão; o
readback confirmou `main.protected:true`, sem atores de bypass. O payload
revisável em [main-branch-protection.json](proposals/main-branch-protection.json)
espelha as regras retornadas pela API.

## Comportamento proposto

Exige PR, branch atualizada, resolução de conversas e os sete checks sempre
executados: `verify`, `business-postgres`, `browser-fixtures`,
`connected-postgres-browser` e `Analyze (javascript-typescript|python|actions)`.
Nomes e GitHub Actions app ID 15368 foram conferidos antes da aplicação. A
ruleset também exige resultados do CodeQL, bloqueando alertas de segurança
`high_or_higher` e erros de análise. Aplica-se a administradores, bloqueia
force push e exclusão da main; histórico com merge commits continua permitido.

Os workflows de migrations/evidência têm filtros de paths e não são checks
obrigatórios globais nesta proposta: exigir um check que não é criado em
toda PR pode impedir integrações documentais. Para mudanças de migrations,
seus testes e gates específicos continuam obrigatórios pelo workflow/DoD.

## Decisão administrativa aplicada

Para o único mantenedor atual, a regra exige PR e checks, com zero aprovações
formais. O Dono continua responsável por revisar e autorizar cada merge;
zero aprovações no GitHub não delega essa decisão ao agente. A ruleset não
concede bypass. Se houver um segundo revisor habilitado, elevar
`required_approving_review_count` para 1 exige nova decisão administrativa.

Não desligar a proteção para resolver uma CI vermelha. A candidata de
hardening do workflow deve passar por estes gates em uma PR real; não se cria
uma prova artificial por escrita direta na main.

Referências: [rulesets de repositório](https://docs.github.com/en/rest/repos/rules)
e [proteção de merge do CodeQL](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/manage-your-configuration/set-merge-protection).
