import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSlides } from '../src/lib/slideParser.ts'
import { DEFAULT_SLIDE_THEME } from '../src/lib/slideThemes.ts'
import { emptyLayout, reconcileEditorLayout, setBlockRect } from '../src/features/editor/layoutModel.ts'
import { normalizePresentationTemplate } from '../src/features/templates/model.ts'
import { buildExportPlan } from '../src/features/export/exportModel.ts'

const parsed=parseSlides('# Aula de Ciência\n\nBem-vindos\n\n## Questão\n\n:::exercise\nQual é a resposta?\n:::\n\n:::answer\nSEGREDO DO GABARITO\n:::')
test('F6: export does not carry solutions or notes',()=>{
  const plan=buildExportPlan({title:'Ciência',slides:parsed,theme:DEFAULT_SLIDE_THEME})
  assert.equal(plan.pages.length,2)
  assert.doesNotMatch(JSON.stringify(plan),/SEGREDO DO GABARITO|speaker_notes|notes/i)
  assert.equal(plan.pages[1].markdown.includes('Qual é a resposta?'),true)
  assert.equal(plan.filename,'ciencia.html')
})
test('F6: filename is safe and does not contain path segments',()=>{
  const plan=buildExportPlan({title:'../Lição: Ciências & Ação ✨',slides:parsed,theme:DEFAULT_SLIDE_THEME})
  assert.equal(plan.filename,'licao-ciencias-acao.html')
})
test('F6: manual geometry survives in exported blocks without revealing private fields',()=>{
  let next=0
  const layout=reconcileEditorLayout(parsed,emptyLayout(),()=>String(++next).padStart(8,'0'))
  const heading=layout.blocks.find(x=>x.kind==='heading')
  assert.ok(heading)
  const arranged=setBlockRect(layout,heading.id,{x:.2,y:.25,w:.5,h:.2,z:4})
  const plan=buildExportPlan({title:'Aula',slides:parsed,theme:DEFAULT_SLIDE_THEME,editorLayout:arranged})
  assert.equal(plan.pages[0].manuallyArranged,true)
  assert.deepEqual(plan.pages[0].blocks.find(b=>b.kind==='heading')?.rect,
    {x:.2,y:.25,w:.5,h:.2,z:4})
  assert.doesNotMatch(JSON.stringify(plan),/SEGREDO DO GABARITO/)
})
test('F6: theme and branding apply to all pages with numbered footer',()=>{
  const tpl=normalizePresentationTemplate({
    theme:{background:'#123456',foreground:'#FFFFFF',accent:'#EFBC45'},
    branding:{showHeader:true,label:'Escola',accentRule:true},
    footer:{text:'Turma 1',showPageNumber:true}
  })
  const plan=buildExportPlan({title:'Aula',slides:parsed,theme:tpl.theme,template:tpl})
  assert.equal(plan.brand.header,'Escola')
  assert.equal(plan.brand.footer,'Turma 1')
  assert.equal(plan.brand.pageNumber,true)
  assert.equal(plan.pages[0].theme.background,'#123456')
})
test('F6: image references and Mermaid code are disclosed before download',()=>{
  const slides=parseSlides('# Aula\n\n![Ilustração](https://example.org/media.png)\n\n```mermaid\nflowchart LR\nA --> B\n```')
  const plan=buildExportPlan({title:'Aula',slides,theme:DEFAULT_SLIDE_THEME})
  assert.deepEqual(plan.externalImages,['https://example.org/media.png'])
  assert.equal(plan.mermaidCount,1)
})
