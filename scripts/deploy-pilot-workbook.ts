import { readFileSync, realpathSync, statSync } from 'node:fs'
import { basename } from 'node:path'
import { execFileSync } from 'node:child_process'
import { readPilotWorkbookCosts } from '../src/features/production/pilot-workbook-costs'

const args = process.argv.slice(2)
const validationOnly = args[0] === '--validate-only'
const path = validationOnly ? args[1] : args[0]
if (!path || args.length !== (validationOnly ? 2 : 1))
  throw new Error('Informe o manifesto privado de custos do workbook.')
const resolved = realpathSync(path)
if (
  /^\.env(?:\.|$)/i.test(basename(resolved)) ||
  statSync(resolved).size > 64_000
)
  throw new Error('Arquivo de referência não permitido.')
const policy = readPilotWorkbookCosts({
  PILOT_STOCK_POLICY: 'workbook_negative',
  PASSWORD_RESET_REDIRECT_ORIGIN:
    'https://cacau-v1-piloto.naiguelcabral.workers.dev',
  PILOT_WORKBOOK_COSTS: readFileSync(resolved, 'utf8'),
})
if (!policy) throw new Error('Referências do workbook não configuradas.')
console.log(
  JSON.stringify({
    workbookSha256: policy.workbookSha256,
    costEntries: Object.keys(policy.costs).length,
    target: 'cacau-v1-piloto',
    validationOnly,
  }),
)
if (!validationOnly)
  execFileSync(
    process.execPath,
    [
      'node_modules/wrangler/bin/wrangler.js',
      'deploy',
      '--env',
      'pilot',
      '--keep-vars',
      '--var',
      `PILOT_WORKBOOK_COSTS:${JSON.stringify(policy)}`,
    ],
    { stdio: 'inherit' },
  )
