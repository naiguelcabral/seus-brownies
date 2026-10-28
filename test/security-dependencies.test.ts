import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { compileFunction } from 'node:vm'
import { z } from 'zod'
import { createElement } from 'react'

const require = createRequire(import.meta.url)

test('the lockfile excludes the vulnerable dependency versions identified in the security review', () => {
  const minimums: Record<string, string> = {
    '@tanstack/react-start': '1.168.60',
    '@tanstack/start-server-core': '1.169.39',
    seroval: '1.6.7',
    'shell-quote': '1.11.0',
    'postcss-selector-parser': '7.1.6',
    esbuild: '0.25.0',
    undici: '7.30.1',
    zod: '4.6.6',
    'js-yaml': '4.3.2',
    sharp: '0.35.5',
    'source-map-js': '1.2.2',
    'fast-uri': '3.1.8',
    'launch-editor': '2.14.2',
    'better-auth': '1.7.7',
    '@better-auth/drizzle-adapter': '1.7.7',
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
    if (name.startsWith('@tanstack/') || name === 'zod')
      assert.ok(matches.length > 0, `Missing required dependency: ${name}`)
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

test('auth integrations resolve one patched release and email conversion excludes the unpatched deepmerge chain', () => {
  const lock = JSON.parse(
    readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'),
  ) as { packages: Record<string, { version?: string }> }
  const release = lock.packages['node_modules/better-auth']?.version
  assert.ok(release, 'Missing Better Auth dependency')
  const coordinatedPackages = new Set([
    'better-auth',
    '@better-auth/core',
    '@better-auth/api-key',
    '@better-auth/passkey',
    '@better-auth/telemetry',
    '@better-auth/drizzle-adapter',
    '@better-auth/kysely-adapter',
    '@better-auth/memory-adapter',
    '@better-auth/mongo-adapter',
    '@better-auth/prisma-adapter',
  ])
  for (const [path, entry] of Object.entries(lock.packages)) {
    const name = path.split('node_modules/').at(-1)
    if (name && coordinatedPackages.has(name))
      assert.equal(entry.version, release, `Mismatched Auth release: ${path}`)
    assert.notEqual(
      name,
      'deepmerge',
      'Unpatched deepmerge must not return through the email renderer',
    )
  }
})

test('the patched email renderer preserves escaped HTML and readable plain text', async () => {
  const neonRequire = createRequire(require.resolve('@neondatabase/neon-js'))
  const authRequire = createRequire(neonRequire.resolve('@neondatabase/auth'))
  const uiRequire = createRequire(authRequire.resolve('@neondatabase/auth-ui'))
  const emailOwnerRequire = createRequire(
    uiRequire.resolve('@daveyplate/better-auth-ui'),
  )
  const componentRequire = createRequire(
    emailOwnerRequire.resolve('@react-email/components'),
  )
  const renderer = componentRequire('@react-email/render') as {
    render: (
      node: ReturnType<typeof createElement>,
      options?: { plainText?: boolean },
    ) => Promise<string>
  }
  const content = createElement(
    'p',
    null,
    'Pedido <pendente> & revisão ',
    createElement('a', { href: 'https://example.test/check' }, 'Conferir'),
  )
  const html = await renderer.render(content)
  assert.ok(html.includes('&lt;pendente&gt; &amp; revisão'))
  assert.ok(!html.includes('<pendente>'))
  const text = await renderer.render(content, { plainText: true })
  assert.ok(text.includes('Pedido <pendente> & revisão'))
  assert.equal(
    text.trim(),
    'Pedido <pendente> & revisão Conferir https://example.test/check',
  )
  assert.ok(!text.includes('<a '))
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

test('application and Neon use patched Zod and reject oversized arrays before parsing their entries', () => {
  const neonRequire = createRequire(require.resolve('@neondatabase/neon-js'))
  assert.equal(neonRequire.resolve('zod'), require.resolve('zod'))

  {
    const schema = z.array(z.object({ productId: z.number().int() })).max(2)
    assert.equal(schema.safeParse([{ productId: 1 }]).success, true)
    assert.equal(schema.safeParse([{ productId: null }]).success, false)
    const excess = schema.safeParse(
      Array.from({ length: 1_000 }, () => ({ productId: null })),
    )
    assert.equal(excess.success, false)
    assert.equal(excess.error.issues.length, 1)
    assert.equal(excess.error.issues[0]?.code, 'too_big')
  }
})
