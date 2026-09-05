import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('a rota raiz redireciona visitantes para o login antes dos loaders', async () => {
  const source = await readFile(
    new URL('../src/routes/__root.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /beforeLoad: async \(\{ location \}\)/)
  assert.match(source, /location\.pathname === '\/login'/)
  assert.match(source, /location\.pathname === '\/login\/redefinir-senha'/)
  assert.match(source, /await getSessionStatus\(\)/)
  assert.match(source, /redirect\(\{ to: '\/login', throw: true \}\)/)
})

test('a rota de recuperação é pública, remove token da URL e não o persiste', async () => {
  const source = await readFile(
    new URL('../src/routes/login/redefinir-senha.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /createFileRoute\('\/login\/redefinir-senha'\)/)
  assert.match(source, /resetPasswordWithTokenFn/)
  assert.match(source, /autoComplete="new-password"/)
  assert.match(source, /const \[token\] = useState\(tokenFromUrl\)/)
  assert.match(source, /if \(!token\)/)
  assert.match(source, /router\.navigate\(\{/)
  assert.match(source, /search: \{\}/)
  assert.match(source, /replace: true/)
  assert.match(source, /name: 'referrer', content: 'no-referrer'/)
  assert.doesNotMatch(source, /console\.(log|info|warn|error)/)
  assert.doesNotMatch(source, /localStorage|sessionStorage/)
})

test('a rota de login é pública e não carrega dados operacionais', async () => {
  const source = await readFile(
    new URL('../src/routes/login.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /createFileRoute\('\/login'\)/)
  assert.doesNotMatch(source, /loader:/)
  assert.match(source, /await getSessionStatus\(\)/)
  assert.match(source, /redirect\(\{ to: '\/', throw: true \}\)/)
})
