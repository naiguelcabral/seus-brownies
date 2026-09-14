import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const routeSource = await readFile(
  new URL('../src/routes/cenarios.tsx', import.meta.url),
  'utf8',
)

test('rota consulta cenários por dependências estreitas e paginação', () => {
  assert.match(routeSource, /loaderDeps: \(\{ search \}\) =>/)
  assert.match(routeSource, /listScenarios\(\{ data: deps \}\)/)
  assert.match(routeSource, /role="search"/)
  assert.match(routeSource, /aria-label="Paginação dos cenários"/)
  assert.match(routeSource, /Página \{result\.page\} de \{result\.totalPages\}/)
})

test('interface separa projeção, realizado, ausências e decisões pendentes', () => {
  assert.match(routeSource, /Meta · premissas · projeção/)
  assert.match(routeSource, /Resultado realizado/)
  assert.match(routeSource, /Dado ausente para o período de vigência/)
  assert.match(routeSource, /decisão financeira ainda não homologada/)
  assert.match(routeSource, /Fluxo de caixa não é usado como\s+substituto/)
  assert.match(routeSource, /planejado versus realizado por produto/)
})

test('mutações e editor ficam condicionados à permissão de escrita', () => {
  assert.match(routeSource, /result\.canWrite \? \(/)
  assert.match(routeSource, /Somente o Dono cria/)
  assert.match(routeSource, /createScenarioVersion/)
  assert.match(routeSource, /activateScenario/)
  assert.match(routeSource, /archiveScenario/)
})

test('rota apresenta estados de carregamento, vazio e erro sem exportação', () => {
  assert.match(routeSource, /Carregando cenários/)
  assert.match(routeSource, /Nenhum cenário encontrado/)
  assert.match(routeSource, /Não foi possível carregar as premissas e versões/)
  assert.doesNotMatch(routeSource, /exportar|download|csv/i)
})

test('formulário não semeia valores financeiros ou mix do workbook', () => {
  assert.match(routeSource, /Nenhum valor do workbook é criado automaticamente/)
  assert.match(routeSource, /monthlyProfitGoal: ''/)
  assert.match(routeSource, /fixedMonthlyCosts: ''/)
  assert.match(routeSource, /mix: \[\]/)
})
