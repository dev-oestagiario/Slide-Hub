import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const catalog = JSON.parse(readFileSync(new URL('../skills/catalog.json', import.meta.url), 'utf8'))
const { bundles } = JSON.parse(readFileSync(new URL('../skills/bundles.json', import.meta.url), 'utf8'))
const requested = [
  'typescript', 'feature-arch', 'tanstack-query',
  'webapp-testing', 'playwright', 'vitest', 'msw', 'test-driven-development', 'systematic-debugging', 'agent-browser',
  'improve-codebase-architecture', 'domain-modeling', 'codebase-design', 'code-review', 'writing-plans', 'supabase-postgres-best-practices'
]
function run(...args) {
  return spawnSync(process.execPath, [new URL('../scripts/install-skills.mjs', import.meta.url).pathname, ...args], {
    encoding: 'utf8'
  })
}

test('todos os 16 skills pedidos estão disponíveis sem duplicações', () => {
  const all = Object.values(bundles).flatMap(group => group.skills)
  assert.equal(all.length, 16)
  assert.equal(new Set(all).size, 16)
  assert.deepEqual(new Set(all), new Set(requested))
  const available = new Set(catalog.skills.map(skill => skill.name))
  for (const name of all) assert.ok(available.has(name), 'Ausente no catálogo: ' + name)
})

test('dry-run seleciona conjuntos combinados sem instalar dependências', () => {
  const result = run('--dry-run', '--bundle', 'frontend,qa,engineering')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Skills selecionadas: 16/)
  assert.equal(result.stdout.split('\n').filter(line => line.includes('npx skills add')).length, 16)
})

test('dry-run de um conjunto seleciona só suas skills', () => {
  const result = run('--dry-run', '--bundle', 'frontend')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Skills selecionadas: 3/)
})

test('falha ao selecionar conjunto ou skill desconhecida', () => {
  assert.notEqual(run('--dry-run', '--bundle', 'inexistente').status, 0)
  assert.notEqual(run('--dry-run', '--only', 'inexistente').status, 0)
})

test('não permite combinação ambígua de --only e --bundle', () => {
  const result = run('--dry-run', '--only', 'typescript', '--bundle', 'qa')
  assert.notEqual(result.status, 0)
})
