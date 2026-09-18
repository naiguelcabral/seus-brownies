import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'

test('conversation redaction removes whole credentials before generic assignments', () => {
  const script = new URL(
    '../scripts/codex/conversation_memory.py',
    import.meta.url,
  ).pathname
  const cases = [
    'Authorization: Bearer fictitious-token',
    'authorization=Bearer short',
    'Proxy-Authorization: Basic ZmljdGl0aW91cw==',
    '{"Authorization": "Bearer fictitious-token", "ok": true}',
    'Cookie: first=fictitious; second=also-private',
    'Set-Cookie: session=fictitious; HttpOnly; Secure',
    'postgresql://fake-user:fake-password@private.invalid/db?token=fictitious',
    'postgres://fake-user:p%40ss@private.invalid/db',
    'postgresql://private.invalid/db?password=fictitious',
    'https://fake-user:fake-password@private.invalid/path',
    'redis://fake-user:fake-password@private.invalid/0',
    'password="fictitious value with spaces"',
    '{"token":"fictitious value"}',
    '-----BEGIN PRIVATE KEY-----\nfictitious\n-----END PRIVATE KEY-----',
    'Bearer short',
  ]
  const output = execFileSync(
    'python3',
    [
      '-B',
      '-c',
      `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location('memory', sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
values = json.load(sys.stdin)
print(json.dumps([[module.redact(v), module.redact(module.redact(v))] for v in values]))
`,
      script,
    ],
    { input: JSON.stringify(cases), encoding: 'utf8' },
  )
  const results = JSON.parse(output) as Array<[string, string]>
  for (const [value, twice] of results) {
    assert.doesNotMatch(
      value,
      /fictitious|short|fake-user|fake-password|private\.invalid|p%40ss|also-private|ZmljdGl0aW91cw/,
    )
    assert.match(value, /REDACTED/)
    assert.equal(value, twice)
  }
})
