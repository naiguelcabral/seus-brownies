import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { compileFunction } from 'node:vm'

const require = createRequire(import.meta.url)

test('the lockfile excludes the vulnerable dependency versions identified in the security review', () => {
  const minimums: Record<string, string> = {
    '@tanstack/react-start': '1.168.60',
    '@tanstack/start-server-core': '1.169.39',
    seroval: '1.6.7',
    'shell-quote': '1.11.0',
    'postcss-selector-parser': '7.1.6',
    esbuild: '0.25.0',
    undici: '7.29.1',
    'js-yaml': '4.3.2',
    sharp: '0.35.5',
    'source-map-js': '1.2.2',
    'fast-uri': '3.1.8',
  }
  const lock = JSON.parse(
    readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'),
  ) as {
    packages: Record<string, { version?: string }>
  }
  for (const [name, minimum] of Object.entries(minimums)) {
    const matches = Object.entries(lock.packages).filter(
      ([path]) =>
        path.endsWith(`/node_modules/${name}`) ||
        path === `node_modules/${name}`,
    )
    // Removing a transitive dependency also removes its vulnerability. The
    // framework packages are required, so their absence must still fail.
    if (name.startsWith('@tanstack/'))
      assert.ok(matches.length > 0, `Missing framework dependency: ${name}`)
    for (const [path, entry] of matches) {
      const [major = 0, minor = 0, patch = 0] = (entry.version ?? '')
        .split('.')
        .map(Number)
      const [minMajor = 0, minMinor = 0, minPatch = 0] = minimum
        .split('.')
        .map(Number)
      assert.ok(
        major > minMajor ||
          (major === minMajor &&
            (minor > minMinor || (minor === minMinor && patch >= minPatch))),
        `${path}: ${entry.version} < ${minimum}`,
      )
    }
  }
})

test('the legacy Drizzle loader still transforms TypeScript with its patched esbuild', () => {
  const loader = require('@esbuild-kit/core-utils') as {
    transformSync: (
      source: string,
      filename: string,
    ) => { code: string; map: unknown }
  }
  const transformed = loader.transformSync(
    'const amount: bigint = 123n; module.exports = amount',
    '/tmp/cacau-security-fixture.ts',
  )
  const output: { exports: unknown } = { exports: null }
  compileFunction(transformed.code, ['module', 'exports'])(
    output,
    output.exports,
  )
  assert.equal(output.exports, 123n)
  assert.ok(transformed.map)
})

test('the typography plugin resolves the patched selector parser and preserves selector structure', () => {
  const typographyRequire = createRequire(
    require.resolve('@tailwindcss/typography'),
  )
  const parser = typographyRequire('postcss-selector-parser') as () => {
    processSync: (selector: string) => string
  }
  const selector = '.prose :where(h1, h2):not(:where(.not-prose *))'
  assert.equal(parser().processSync(selector), selector)
})
