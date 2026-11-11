import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BUILTIN_PRESENTATION_TEMPLATES, normalizePresentationTemplate,
  templateChoices, layoutPresentation, presentationApplyPatch,
  configFromSnapshot, themeOverrideSnapshot
} from '../src/features/templates/model.ts'
import { parseSlides } from '../src/lib/slideParser.ts'

test('F2: seis modelos internos sem exigência de JSON do professor', () => {
  assert.equal(BUILTIN_PRESENTATION_TEMPLATES.length, 6)
  assert.equal(new Set(BUILTIN_PRESENTATION_TEMPLATES.map(x=>x.id)).size, 6)
  assert.ok(BUILTIN_PRESENTATION_TEMPLATES.every(x=>x.kind==='builtin'))
})
test('F2: normalização mantém compatibilidade com temas simples', () => {
  const old = normalizePresentationTemplate({ background:'#123456', foreground:'#FFFFFF', accent:'#ABCDEF' })
  assert.equal(old.theme.background,'#123456')
  assert.equal(old.layouts.cover,'center')
  assert.equal(old.layouts.content,'default')
  assert.equal(old.layouts.exercise,'center')
  assert.equal(old.schemaVersion,1)
})
test('F2: layouts e rodapé inválidos não são propagados',()=>{
  const data=normalizePresentationTemplate({
    theme:{background:'url(javascript:evil)',foreground:'#FFF',accent:'#999'},
    layouts:{cover:'script',content:'split',exercise:'invalid'},
    footer:{text:'abc'.repeat(100),showPageNumber:'false'}
  })
  assert.equal(data.layouts.cover,'center')
  assert.equal(data.layouts.content,'split')
  assert.equal(data.layouts.exercise,'center')
  assert.ok(data.footer.text.length<=80)
  assert.equal(data.footer.showPageNumber,true)
})
test('F2: templates persistidos são separados dos internos',()=>{
  const list=templateChoices([{id:'own-id',owner_id:'teacher',name:'Institucional',description:'',config:{},revision:2}])
  assert.equal(list.length,7)
  assert.equal(list[6].kind,'personal')
  assert.equal(list[6].revision,2)
})
test('F2: layout automático respeita exercício e diretiva manual',()=>{
  const source='# Início\nBem-vindos\n## Conteúdo\nExplicação\n<!-- slide: layout=split -->\n## Comparação\nA e B\n<!-- slide -->\n:::exercise\nPergunta\n:::'
  const slides=parseSlides(source)
  const template=normalizePresentationTemplate({layouts:{cover:'center',content:'center',exercise:'split'}})
  const result=layoutPresentation(slides,template)
  assert.equal(result[0].layout,'center')
  assert.equal(result[1].layout,'center')
  assert.equal(result[2].layout,'split')
  assert.equal(result[3].layout,'split')
  assert.deepEqual(slides.map(s=>s.layout),['default','default','split','default'])
})
test('F2: aplicar template altera apenas colunas visuais',()=>{
  const choice=BUILTIN_PRESENTATION_TEMPLATES[2]
  const patch=presentationApplyPatch(choice)
  assert.deepEqual(Object.keys(patch).sort(),['presentation_template_id','presentation_template_snapshot','template_id','theme_config'])
  assert.equal(patch.presentation_template_id,null)
  assert.deepEqual(patch.theme_config,choice.config.theme)
  assert.equal(configFromSnapshot(patch.presentation_template_snapshot)?.schemaVersion,1)
})
test('F2: snapshot não acompanha edição do template de origem',()=>{
  const original=BUILTIN_PRESENTATION_TEMPLATES[0].config
  const before=presentationApplyPatch(BUILTIN_PRESENTATION_TEMPLATES[0])
  const edited=themeOverrideSnapshot(before.presentation_template_snapshot,{...original.theme,accent:'#112233'})
  assert.ok(edited)
  assert.equal(edited.theme.accent,'#112233')
  assert.equal(before.presentation_template_snapshot.theme.accent,original.theme.accent)
  assert.deepEqual(edited.layouts,original.layouts)
  assert.equal(configFromSnapshot({}),null)
})
