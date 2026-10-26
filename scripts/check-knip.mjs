import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const issueTypes = new Set([
  'binaries',
  'catalog',
  'catalogReferences',
  'dependencies',
  'devDependencies',
  'duplicates',
  'enumMembers',
  'exports',
  'files',
  'namespaceMembers',
  'optionalPeerDependencies',
  'types',
  'unlisted',
  'unresolved',
])

export function normalizeKnipReport(report) {
  if (!report || !Array.isArray(report.issues)) {
    throw new Error('Knip did not return a valid issues report')
  }
  const findings = []
  for (const issue of report.issues) {
    if (typeof issue.file !== 'string') throw new Error('Invalid Knip file')
    for (const [type, entries] of Object.entries(issue)) {
      if (type === 'file') continue
      if (!issueTypes.has(type) || !Array.isArray(entries)) {
        throw new Error(`Unsupported Knip report field: ${type}`)
      }
      for (const entry of entries) {
        if (typeof entry.name !== 'string') {
          throw new Error(`Invalid Knip finding: ${issue.file} (${type})`)
        }
        findings.push({ file: issue.file, type, name: entry.name })
      }
    }
  }
  return findings.sort((a, b) => findingKey(a).localeCompare(findingKey(b)))
}

function findingKey(finding) {
  return JSON.stringify([finding.file, finding.type, finding.name])
}

export function compareKnipBaseline(findings, baseline) {
  if (
    baseline?.version !== 1 ||
    baseline.knipVersion !== '6.42.1' ||
    !Array.isArray(baseline.findings) ||
    baseline.findings.some(
      (item) =>
        typeof item.file !== 'string' ||
        typeof item.name !== 'string' ||
        !issueTypes.has(item.type),
    )
  ) {
    throw new Error('Invalid Knip baseline')
  }
  const expected = new Set(baseline.findings.map(findingKey))
  const actual = new Set(findings.map(findingKey))
  return {
    added: findings.filter((finding) => !expected.has(findingKey(finding))),
    resolved: baseline.findings.filter(
      (finding) => !actual.has(findingKey(finding)),
    ),
  }
}

function main() {
  const require = createRequire(import.meta.url)
  const packagePath = join(
    dirname(require.resolve('knip')),
    '..',
    'package.json',
  )
  const { version } = JSON.parse(readFileSync(packagePath, 'utf8'))
  if (version !== '6.42.1') throw new Error('Unexpected Knip version')
  const result = spawnSync(
    process.execPath,
    [
      join(dirname(packagePath), 'bin/knip.js'),
      '--config',
      'knip.json',
      '--no-progress',
      '--reporter',
      'json',
    ],
    {
      encoding: 'utf8',
      env: { PATH: process.env.PATH, NO_COLOR: '1' },
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    },
  )
  if (result.error || result.signal || ![0, 1].includes(result.status)) {
    throw new Error('Knip execution failed; baseline cannot approve this run')
  }
  if (result.stderr) process.stderr.write(result.stderr)
  const findings = normalizeKnipReport(JSON.parse(result.stdout))
  if (result.status === 1 && findings.length === 0) {
    throw new Error('Knip failed without reportable findings')
  }
  const baseline = JSON.parse(
    readFileSync(new URL('../knip-baseline.json', import.meta.url), 'utf8'),
  )
  const { added, resolved } = compareKnipBaseline(findings, baseline)
  console.log(
    `Knip: ${findings.length} current findings; ${added.length} new; ${resolved.length} resolved.`,
  )
  console.log(
    'All current findings remain visible through npm run knip:audit or knip:report.',
  )
  for (const finding of findings) console.log('CURRENT', findingKey(finding))
  for (const finding of added) console.error('NEW', findingKey(finding))
  for (const finding of resolved)
    console.error('RESOLVED: remove from baseline', findingKey(finding))
  // Resolved items must be removed, so the baseline cannot permit their return.
  if (added.length || resolved.length) process.exitCode = 1
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Knip check failed')
    process.exitCode = 1
  }
}
