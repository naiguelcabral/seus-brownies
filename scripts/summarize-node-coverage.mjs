import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { isAbsolute, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const sources = execFileSync('git', ['ls-files', '-z', 'src'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\0')
  .filter((file) => /\.tsx?$/.test(file))
const measured = new Set()
const totals = { LF: 0, LH: 0, FNF: 0, FNH: 0, BRF: 0, BRH: 0 }
let included = false
for (const line of readFileSync(
  new URL('../coverage/node.lcov', import.meta.url),
  'utf8',
).split('\n')) {
  if (line.startsWith('SF:')) {
    const path = line.slice(3)
    const file = isAbsolute(path) ? relative(root, path) : path
    included = sources.includes(file)
    if (included) measured.add(file)
  } else if (included) {
    const [metric, raw] = line.split(':')
    if (Object.hasOwn(totals, metric)) totals[metric] += Number(raw)
  }
}
if (!measured.size || !totals.LF)
  throw new Error('Node coverage report is empty')
const summary = {
  scope:
    'Node unit tests only; unmeasured sources are explicitly listed, not counted as covered',
  sourceFiles: sources.length,
  measuredFiles: measured.size,
  unmeasuredFiles: sources.filter((file) => !measured.has(file)),
  measuredTotals: totals,
}
writeFileSync(
  new URL('../coverage/node-summary.json', import.meta.url),
  JSON.stringify(summary, null, 2) + '\n',
)
console.log(
  JSON.stringify({
    sourceFiles: sources.length,
    measuredFiles: measured.size,
    unmeasuredFiles: summary.unmeasuredFiles.length,
    measuredTotals: totals,
  }),
)
