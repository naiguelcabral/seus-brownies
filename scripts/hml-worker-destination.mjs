// Operator-side local utility. This agent must only use synthetic input.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export function sanitizeDestination(raw, matrix) {
  try {
    if (typeof raw !== 'string' || raw.length > 8192 || /[\r\n\0]/.test(raw))
      throw new Error()
    const url = new URL(raw)
    if (
      !['postgresql:', 'postgres:'].includes(url.protocol) ||
      url.hash ||
      (url.port && url.port !== '5432')
    )
      throw new Error()
    const host = url.hostname.toLowerCase().replace(/-pooler(?=\.)/, '')
    const database = decodeURIComponent(url.pathname.slice(1))
    if (
      [...url.searchParams.keys()].some((k) =>
        /^(options|host|port|dbname|database|endpoint|branch|project)$/i.test(
          k,
        ),
      )
    )
      throw new Error()
    if (
      !/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(host) ||
      !/^[a-zA-Z0-9_-]{1,63}$/.test(database)
    )
      throw new Error()
    const forbidden = [
      url.username,
      url.password,
      ...url.searchParams.keys(),
      ...url.searchParams.values(),
    ]
      .map((x) => decodeURIComponent(x))
      .filter(Boolean)
    // No inference from credentials or query parameters. Only exact metadata mapping.
    const matches = matrix.filter(
      (r) => r.host === host && r.database === database,
    )
    const expected = matches.length === 1 ? matches[0] : null
    if (
      expected &&
      /prod(?:uction)?/i.test(expected.name + ' ' + expected.classification)
    )
      throw new Error()
    const result = {
      host_sanitized: host,
      database,
      project: expected?.project ?? null,
      branch: expected?.branch ?? null,
      fingerprint: createHash('sha256')
        .update(`${host}:5432/${database}`)
        .digest('hex'),
      match: expected ? 'exact-metadata-match-not-hml-proof' : 'unmatched',
    }
    const output = JSON.stringify(result)
    if (
      forbidden.some((x) => output.includes(x)) ||
      /postgres(?:ql)?:\/\/|@/.test(output)
    )
      throw new Error()
    return result
  } catch {
    throw new Error('BLOCKED_DESTINATION')
  }
}
export async function hiddenInput(
  input = process.stdin,
  output = process.stderr,
) {
  if (!input.isTTY || typeof input.setRawMode !== 'function')
    throw new Error('BLOCKED_SECURE_INPUT')
  output.write('Destino (entrada oculta; não use gravação de terminal): ')
  input.setRawMode(true)
  input.resume()
  input.setEncoding('utf8')
  return new Promise((resolveInput, reject) => {
    let value = ''
    const cleanup = () => {
      input.off('data', onData)
      input.off('end', onEnd)
      input.off('error', onEnd)
      input.setRawMode(false)
      input.pause()
      output.write('\n')
    }
    const onEnd = () => {
      value = ''
      cleanup()
      reject(new Error('BLOCKED_SECURE_INPUT'))
    }
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\u0003' || value.length > 8192) {
          value = ''
          cleanup()
          reject(new Error('BLOCKED_SECURE_INPUT'))
          return
        }
        if (ch === '\r' || ch === '\n') {
          const result = value
          value = ''
          cleanup()
          resolveInput(result)
          return
        }
        if (ch === '\u007f') {
          value = value.slice(0, -1)
        } else value += ch
      }
    }
    input.on('data', onData)
    input.once('end', onEnd)
    input.once('error', onEnd)
  })
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (process.argv.length !== 2) throw new Error()
    const matrix = JSON.parse(
      readFileSync(
        new URL(
          '../docs/governance/evidence/hml-evidence-targets.json',
          import.meta.url,
        ),
        'utf8',
      ),
    ).databases
    let raw = await hiddenInput()
    const result = sanitizeDestination(raw, matrix)
    raw = ''
    process.stdout.write(JSON.stringify(result) + '\n')
  } catch {
    process.stderr.write('BLOCKED_DESTINATION\n')
    process.exitCode = 1
  }
}
