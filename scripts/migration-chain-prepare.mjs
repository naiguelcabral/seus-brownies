#!/usr/bin/env node
// Official offline preparation/review entrypoint. Never applies migrations.
import { lstatSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildForwardCandidate } from './migration-chain-forward-candidate.mjs'
import { evaluateForwardReadiness } from './migration-chain-readiness.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const evidenceRoot = resolve(root, 'evidence') + sep
function readEvidence(path) {
  if (
    typeof path !== 'string' ||
    extname(path) !== '.json' ||
    /:\/\//.test(path)
  )
    throw new Error('INVALID_EVIDENCE')
  const resolved = realpathSync(path)
  if (
    !resolved.startsWith(evidenceRoot) ||
    resolved
      .slice(evidenceRoot.length)
      .split(sep)
      .some((part) => part.startsWith('.')) ||
    lstatSync(path).isSymbolicLink() ||
    !lstatSync(resolved).isFile() ||
    lstatSync(resolved).size > 1_000_000
  )
    throw new Error('INVALID_EVIDENCE')
  return JSON.parse(readFileSync(resolved, 'utf8'))
}
export function runPreparation(argv) {
  if (argv[0] === '--review') {
    argv = argv.slice(1)
    if (argv.length !== 2) throw new Error('EVIDENCE_REQUIRED')
  }
  if (!(argv.length === 0 || (argv.length === 2 && argv[0] === '--evidence')))
    throw new Error('INVALID_ARGUMENTS')
  // Validate the evidence path before building anything. Errors are sanitized by CLI.
  const evidence = argv.length ? readEvidence(argv[1]) : null
  const candidate = buildForwardCandidate()
  if (!argv.length)
    return {
      status: 'PREPARED_FOR_REVIEW',
      line: 'forward-compatibility-v1',
      folder: candidate.folder,
      manifest: candidate.manifest,
      application_authorized: false,
      execution_enabled: false,
    }
  try {
    return evaluateForwardReadiness(evidence, candidate.manifest)
  } finally {
    rmSync(candidate.folder, { recursive: true, force: true })
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = runPreparation(process.argv.slice(2))
    process.stdout.write(JSON.stringify(result) + '\n')
    process.exitCode = result.status === 'BLOCKED' ? 1 : 0
  } catch {
    process.stderr.write('BLOCKED_OFFLINE_MIGRATION_REVIEW\n')
    process.exitCode = 1
  }
}
