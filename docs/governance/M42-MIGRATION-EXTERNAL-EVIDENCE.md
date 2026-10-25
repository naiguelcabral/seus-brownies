# M42 — evidências externas das migrations 0017–0028

Data de revalidação: 14 de outubro de 2026 UTC. Estado: `BLOCKED-NO-READONLY-AUDIT`.

Esta é uma evidência sanitizada. Não contém DSN, segredo, usuário de conexão,
linhas de negócio, dump ou saída SQL. Nenhuma migration, backfill, DDL, DML,
restore, criação de branch Neon, alteração de Worker ou deploy foi feito.

## Estado de entrada

- PR #41 foi integrada como `961081432f7e4ade133822d7a33300a88eca8fbc`; a CI
  pós-merge `38505897780` passou.
- Localmente, `0017` referencia `products.unit`, enquanto `0016` possui
  `products.measurement_unit`; PostgreSQL 17 devolve `42703` e reverte catálogo
  e journal da transação.
- A estratégia A continua `LAB-ONLY`. A PR #41 bloqueia aplicação acidental e
  não modifica SQL, journal ou snapshots publicados.

## Inventário Neon sanitizado

| Projeto                | Branch        | Estado   | Endpoint                                 | Role disponível | Classificação              | Histórico/schema/backup/restore/Worker |
| ---------------------- | ------------- | -------- | ---------------------------------------- | --------------- | -------------------------- | -------------------------------------- |
| `cool-base-25902164`   | `production`  | archived | `ep-[redacted:de391793]` read_write | `neondb_owner`  | `production-do-not-access` | unverified                             |
| `cool-base-25902164`   | `development` | archived | `ep-[redacted:98ec77d0]` read_write     | `neondb_owner`  | `candidate-hml`            | unverified                             |
| `steep-brook-51659857` | `production`  | archived | `ep-[redacted:26398d41]` read_write      | `neondb_owner`  | `production-do-not-access` | unverified                             |
| `steep-brook-51659857` | `Development` | archived | `ep-[redacted:4f8d290f]` read_write      | `neondb_owner`  | `insufficient-evidence`    | unverified                             |
| `steep-brook-51659857` | `g1-auth-hml` | archived | `ep-[redacted:d0e61006]` read_write       | `neondb_owner`  | `candidate-hml`            | unverified                             |

Cada branch expõe apenas `neondb`. A API de snapshots retornou nenhuma entrada;
isso não demonstra ausência de backup, PITR ou restauração. `archived`, nome,
tamanho lógico ou endpoint idle também não demonstram finalidade, ausência de
migrations ou inexistência de cópias externas.

Como a única role observada é owner e todos os endpoints são `read_write`, não
foi feita consulta SQL externa. Isso impede comprovar journal Drizzle, hashes,
catálogo, aplicação parcial, contagens agregadas, backups e restauração.

## Worker para banco

`cacau-v1-hml` permanece no deployment `8268b409-34bc-4881-9694-52c292da2da3`,
versão `e241b715-99bf-4a83-82ba-eef24fedadaa`, a 100%. `DATABASE_URL` é
`secret_text`; seu valor não foi lido. Worker → Neon é `unverified`.

O operador deve executar, em TTY privado e sem gravação de sessão:

```bash
node scripts/hml-worker-destination.mjs
```

O utilitário não aceita argumento, pipe, variável de ambiente ou arquivo;
retorna somente projeto, branch, banco, host sanitizado e fingerprint SHA-256.
A devolução permitida é esse JSON sanitizado, versão, UTC, responsável e aceite.
Nunca enviar DSN, credenciais ou parâmetros ao repositório, Notion ou conversa.

## Pacote para auditoria somente leitura

O operador deve fornecer uma role temporária exclusiva, não owner e sem herdar
`neondb_owner`; sem capacidades de escrita, ownership ou execução mutável, com
`default_transaction_read_only=on`, ticket, responsável, validade curta e
revogação. Esta M42 não cria role, GRANT ou REVOKE.

O verificador já exige `BEGIN ... READ ONLY`, identidade, `transaction_read_only`,
memberships, privilégios, destino e bloqueio de produção antes de catálogo,
journal ou contagens. Ele recusa produção, views, RLS e resultados incompletos.
Ver [HML-MIGRATION-EVIDENCE-GATES.md](HML-MIGRATION-EVIDENCE-GATES.md) e
[HML-DATABASE-OPERATOR-ATTESTATION.md](HML-DATABASE-OPERATOR-ATTESTATION.md).

## Backup, recuperação e decisões

Para as cinco bases, responsável, origem/finalidade, tipo/data/retenção do
backup, último restore, resultado, RPO, RTO, indisponibilidade e restauração
independente são `PENDING-HUMAN`. Não foi criado snapshot, backup, restore point
ou branch.

`0019` semeia oito parâmetros financeiros. Valores, moeda/unidade, fonte,
vigência, competência/caixa, créditos, reversões, histórico e ausências seguem
`pending-human`; recomendação: vigência explícita, efeito prospectivo e fatos
preservados. `0028` adiciona `product_name NOT NULL`; em laboratório funciona
com mix vazio e falha com mix prévio (`23502`), revertendo a transação. Política
de snapshot/dinâmica, renomeação, inativos, ausências e backfill segue humana.

Estratégia A só sai de laboratório após inventário global, journal e catálogo
de todas as bases, ausência de `0017+` e parcial, atestação Worker, backup e
restore aprovados e decisões `0019`/`0028` aceitas. Aplicação continua proibida.

## Segurança

Os testes do sanitizador cobrem credenciais sintéticas em stdout/stderr, recusa
de URL como argumento e ausência de TTY. Os testes do verificador cobrem falha
fechada, grants/membership, produção e erro de driver. A auditoria anterior
registra 13 vulnerabilidades transitivas; nenhuma dependência foi atualizada.
O risco da PR #13 continua documentado; ela não foi modificada.

## Revalidação M44 — 16 de outubro de 2026 UTC

O inventário MCP somente de metadados foi repetido sem SQL. As duas branches
de `cool-base` seguem `archived`; as três de `steep-brook` agora retornam
`ready`. As cinco continuam com banco `neondb`, role listada
`neondb_owner`, endpoint `read_write` e nenhuma snapshot listada. A retenção
informada em ambos os projetos é seis horas; isso não prova backup ou restore.
O MCP continua administrativo, portanto a auditoria externa segue
`VALIDATION-BLOCKED-NO-READONLY-AUDIT`. Detalhe e matriz:
[M44-READONLY-AUDIT-READINESS.md](M44-READONLY-AUDIT-READINESS.md).
