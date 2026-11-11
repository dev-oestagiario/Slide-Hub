#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(readFileSync(resolve(root, 'skills/catalog.json'), 'utf8'))
const { bundles } = JSON.parse(readFileSync(resolve(root, 'skills/bundles.json'), 'utf8'))
const skills = catalog.skills
const byName = new Map(skills.map(skill => [skill.name, skill]))
const args = process.argv.slice(2)

function fail(message) {
  console.error(message)
  process.exit(2)
}
function option(flag) {
  const index = args.indexOf(flag)
  if (index < 0) return null
  const value = args[index + 1]
  if (!value || value.startsWith('--')) fail('Informe um valor para ' + flag)
  return value.split(',').map(item => item.trim()).filter(Boolean)
}
function describe() {
  console.log('Uso: node scripts/install-skills.mjs [--dry-run] [--list] [--bundle frontend,qa,engineering | --only skill1,skill2]')
  console.log('Conjuntos disponíveis:')
  for (const [name, item] of Object.entries(bundles)) {
    console.log('  ' + name + ' (' + item.skills.length + '): ' + item.description)
  }
  console.log('Instalação é opcional, explícita e nunca ocorre no CI.')
}

if (args.includes('--help') || args.includes('-h')) {
  describe()
  process.exit(0)
}
if (args.includes('--list')) {
  describe()
  process.exit(0)
}
const only = option('--only')
const requestedBundles = option('--bundle')
if (only && requestedBundles) fail('Use apenas --only ou --bundle por execução.')
if (requestedBundles) {
  for (const name of requestedBundles) if (!Object.hasOwn(bundles, name)) fail('Conjunto desconhecido: ' + name)
}
const names = only || (requestedBundles
  ? requestedBundles.flatMap(name => bundles[name].skills)
  : skills.map(skill => skill.name))
if (names.length === 0) fail('Nenhuma skill selecionada.')
for (const name of names) if (!byName.has(name)) fail('Skill não encontrada no catálogo: ' + name)
const selected = [...new Set(names)].map(name => byName.get(name))
const dry = args.includes('--dry-run')
console.log('Skills selecionadas: ' + selected.length)
let failures = 0
for (const [index, skill] of selected.entries()) {
  const commandArgs = ['skills', 'add', skill.package, '-y']
  console.log('[' + (index + 1) + '/' + selected.length + '] npx ' + commandArgs.join(' '))
  if (dry) continue
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })
  if (result.error || result.status !== 0) {
    failures++
    console.error('Falha ao instalar: ' + skill.name)
  }
}
console.log('Skills processadas: ' + selected.length + '; falhas: ' + failures)
if (failures) process.exitCode = 1
