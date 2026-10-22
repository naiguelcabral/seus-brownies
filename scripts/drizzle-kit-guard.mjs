#!/usr/bin/env node
// Offline fail-closed guard for Drizzle Kit commands that would write to the
// active migration chain or straight to a database. It never loads dotenv,
// opens a connection or invokes Drizzle.

const blocked = {
  generate:
    'a cadeia ativa `drizzle/` termina em 0028, mas o schema já reflete 0029–0033; ' +
    '`drizzle-kit generate` aqui criaria uma migration duplicando colunas aplicadas. ' +
    'Use `npm run db:prepare` (docs/governance/MIGRATION-CHAIN-REMEDIATION-ADR.md).',
  push:
    '`drizzle-kit push` altera o banco sem migration auditável. ' +
    'Siga docs/governance/MIGRATION-OPERATOR-PROCEDURE.md.',
}

const command = process.argv[2]
if (!Object.hasOwn(blocked, command)) {
  console.error('Uso: drizzle-kit-guard.mjs <generate|push>')
  process.exit(2)
}
console.error(`ERRO: ${blocked[command]}`)
process.exit(1)
