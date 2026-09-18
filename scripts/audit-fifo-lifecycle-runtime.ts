export {}

const args = process.argv.slice(2)
const value = (flag: string) => args[args.indexOf(flag) + 1]
const baseUrl = value('--runtime-url')
const endpoint = value('--endpoint')
const output = value('--output')

if (
  !baseUrl ||
  !endpoint ||
  !output ||
  !output.startsWith('/tmp/seus-brownies-playwright/')
) {
  throw new Error(
    'Uso: tsx scripts/audit-fifo-lifecycle-runtime.ts --runtime-url http://127.0.0.1:4173 --endpoint /api/audit --output /tmp/seus-brownies-playwright/audit.json',
  )
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl))
  throw new Error(
    'A auditoria aceita somente runtime local em 127.0.0.1 ou localhost.',
  )
if (!endpoint.startsWith('/'))
  throw new Error('Endpoint deve ser caminho relativo.')

const response = await fetch(new URL(endpoint, baseUrl), {
  headers: { accept: 'application/json' },
})
const body = await response.text()
const sanitized = body.replace(
  /(postgres(?:ql)?:\/\/)[^\s"']+/gi,
  '$1[REDACTED]',
)
await import('node:fs/promises').then(({ writeFile }) =>
  writeFile(
    output,
    JSON.stringify({ status: response.status, body: sanitized }, null, 2),
  ),
)
if (!response.ok)
  throw new Error(`Auditoria runtime falhou com HTTP ${response.status}.`)
