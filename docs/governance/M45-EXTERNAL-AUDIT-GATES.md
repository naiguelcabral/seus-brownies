# M45 — gates externos de auditoria

Revalidação e preparação local: 16 de outubro de 2026 UTC. Estado externo:
`VALIDATION-BLOCKED-NO-READONLY-AUDIT`.

Este registro acrescenta evidência à M44, sem reescrever evidência histórica.
Nenhum SQL foi executado no Neon; não houve migration, role/grant externo,
backup, snapshot, restore, deploy, leitura de `.env`, DSN, secret, token ou
binding.

## Integração controlada da M44

- A PR #43 foi revisada no SHA `3e19a24ed5b72c177f1d61c263be2a5da228601f`:
  aberta, sem conflitos, sem review/thread pendente, e sem migrations,
  lockfile, workflow ou configuração no diff.
- As CIs da PR passaram: `38883306153` (CI), `38883306124` (PostgreSQL 17) e
  `38883300001` (push).
- A PR saiu de draft e foi integrada por merge commit `32a9e11984d9d3957340d1ab6ae31adb3b2b22f6`, com parents
  `6eed5053dc9ae3f4d156440551f64c3acdb6b25e` e `3e19a24ed5b72c177f1d61c263be2a5da228601f`.
  A branch de origem foi preservada; `3e19a24` é ancestral de `origin/main`.
- A CI pós-merge `38922738966` (workflow `CI`, evento `push`) terminou
  `success` para `32a9e119`.

## Inventário MCP somente de metadados

Ambos os projetos são PostgreSQL 17 e reportam retenção de histórico de
21.600 s (seis horas). Em cada branch, o banco é `neondb`, a única role
listada é `neondb_owner`, há um endpoint `read_write` `idle`, e snapshots
listados são zero. A conexão MCP está conectada com privilégio administrativo
(`ADMIN`); isso não é uma credencial de auditoria.

| Projeto                | Branch / parent                              | Estado     | Endpoint                      |
| ---------------------- | -------------------------------------------- | ---------- | ----------------------------- |
| `cool-base-25902164`   | `production` / —                             | `archived` | `ep-raspy-resonance-ac4rhkwk` |
| `cool-base-25902164`   | `development` / `br-empty-frog-acy6xycn`     | `archived` | `ep-young-cloud-acftfl9s`     |
| `steep-brook-51659857` | `production` / —                             | `ready`    | `ep-late-water-acahd1z1`      |
| `steep-brook-51659857` | `Development` / `br-lingering-wind-acwh5wap` | `ready`    | `ep-tiny-night-ac0pjhlr`      |
| `steep-brook-51659857` | `g1-auth-hml` / `br-bitter-dew-ac31uci9`     | `ready`    | `ep-old-sound-acmcy3e9`       |

As três branches `steep-brook` continuam `ready`; esse estado de control plane
não prova HML, conteúdo, backup, vínculo com Worker ou autorização de auditoria.
As configurações públicas retornadas nos dois projetos foram
`allowed_ips.ips=[]`, `protected_branches_only=false`,
`block_public_connections=false` e `block_vpc_connections=false`. São somente
metadados de rede e não comprovam exposição, backup ou restauração.

| Afirmação                        | Estado                |
| -------------------------------- | --------------------- |
| MCP conectado                    | confirmado            |
| MCP administrativo               | confirmado            |
| Banco identificado por metadados | confirmado (`neondb`) |
| HML confirmado                   | não comprovado        |
| Worker → Neon                    | `unverified`          |
| Auditoria read-only autorizada   | não autorizada        |

## Worker e operador privado

O GET sanitizado confirmou o Worker `cacau-v1-hml`, deployment
`8268b409-34bc-4881-9694-52c292da2da3`, versão
`e241b715-99bf-4a83-82ba-eef24fedadaa`, 100% do tráfego e binding
`DATABASE_URL` de tipo `secret_text`. O valor não foi lido, exportado ou usado.

O operador, em terminal privado sem gravação, deve executar somente
`node scripts/hml-worker-destination.mjs`, inserir o valor pelo mecanismo
autorizado e devolver apenas o JSON sanitizado: `sanitizer_version`,
`observed_at_utc`, projeto, branch, banco, host sanitizado, fingerprint e
resultado do match, mais responsável/ticket/aceite. Não deve devolver URL,
usuário, senha, query string ou secret. O utilitário exige TTY, recusa
argumentos e saída inesperada, não grava o valor e falha fechadamente.

## Role e auditoria futura

`scripts/hml-readonly-audit-role.lab.sql` e
`scripts/hml-readonly-audit-role-revoke.lab.sql` são exclusivamente
**LAB-ONLY**; não são instrução para Neon. No PostgreSQL 17 descartável, eles
provaram role temporária `NOINHERIT`, sem atributos administrativos,
`default_transaction_read_only=on`, sem membership/ownership, sem `CREATE`,
DML ou mutação de sequence, com `CONNECT`/`USAGE`/`SELECT` mínimos, sem
privilégios padrão concedidos a novos objetos e com revogação/remoção ao fim.

O verificador fail-closed continua a validar alvo, identidade, atributos,
membership, ownership, privilégios efetivos (inclusive `PUBLIC`) e sessão
read-only antes de catálogo ou journal. Recusa `neondb_owner`, produção e
qualquer evidência ausente/ambígua. Somente depois do gate humano o operador
poderá usar canal transitório seguro para abrir `BEGIN TRANSACTION READ ONLY`,
timeouts curtos, consultar catálogo/journal/hashes e emitir somente digest,
estado e contagens agregadas; deve encerrar e revogar a credencial.

O gate requer uma role transitória exclusiva, diferente de `neondb_owner`, sem
SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS, sem membership ou
herança gravável, ownership, CREATE, DML, REFERENCES ou TRIGGER, com validade
curta, ticket, responsável e revogação planejada. Até haver prova sanitizada,
nenhuma conexão ou SQL externo é permitido.

## Validação local

Passaram os 12 testes direcionados do gate, `npm test` (453 testes), lint,
typecheck e `git diff --check`. Dois PostgreSQL 17 descartáveis de loopback
confirmaram os 18 casos da cadeia e a prova da role/read-only; as fixtures
foram removidas ao término. Os builds `build:ci-isolated` e `build:hml`
passaram no HEAD limpo com somente a chave pública sintética de Turnstile, sem
carregar `.env` e sem deploy.

A PR #44 foi aberta em rascunho para `main`. No SHA
`395ebd67eb39a33166e088d2b147351ad5ddfc5a`, passaram a CI de push
`38983532128`, a CI de PR `38983546680` e PostgreSQL 17
`38983546701`. Esse registro não autoriza merge da PR M45.

## Backup, cadeia e decisões

Zero snapshots e seis horas de histórico não demonstram backup suficiente. A
matriz por base, responsável, retenção, RPO/RTO, destino independente e último
restore permanece `unverified` em
[M44-READONLY-AUDIT-READINESS.md](M44-READONLY-AUDIT-READINESS.md) e na
atestado do operador. Nenhuma das cinco linhas é `not-applicable`.

As migrations `0017–0028` continuam somente publicadas/localmente testadas;
nenhuma foi aplicada externamente. As decisões `0019` (valores, unidade,
moeda, vigência, competência/caixa, créditos, reversões e histórico) e `0028`
(snapshot/referência, intervalo `0027–0028`, renomeações, inativos, ausentes e
backfill) permanecem exclusivamente do Dono. A recomendação técnica registrada
continua: fatos financeiros versionados/prospectivos e nome histórico como
snapshot comprovado, nunca inferido.

## Próximo passo humano exato

O responsável deve preencher privadamente a atestação do Worker, a ficha de
backup/restore e a prova sanitizada de uma role transitória estritamente
read-only. Com ticket, responsável, validade e plano de revogação, solicitar
autorização nova e delimitada antes de qualquer SQL de auditoria.
