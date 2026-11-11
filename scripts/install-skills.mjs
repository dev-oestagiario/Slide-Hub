#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname,resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const {skills}=JSON.parse(readFileSync(resolve(root,'skills/catalog.json'),'utf8'))
const dry=process.argv.includes('--dry-run')
const position=process.argv.indexOf('--only')
const only=position>=0 ? new Set((process.argv[position+1]||'').split(',').map(v=>v.trim())) : null
const selected=skills.filter(s=>!only||only.has(s.name))
if(!selected.length){console.error('Nenhuma skill selecionada.');process.exit(1)}
let failures=0
for(const [i,skill] of selected.entries()){
  const args=['skills','add',skill.package,'-y']
  console.log('['+(i+1)+'/'+selected.length+'] npx '+args.join(' '))
  if(dry)continue
  const command=process.platform==='win32'?'npx.cmd':'npx'
  const r=spawnSync(command,args,{cwd:root,stdio:'inherit',shell:process.platform==='win32'})
  if(r.error||r.status!==0){failures++;console.error('Falha ao instalar: '+skill.name)}
}
console.log('Skills processadas: '+selected.length+'; falhas: '+failures)
if(failures)process.exitCode=1
