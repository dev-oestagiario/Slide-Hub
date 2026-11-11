import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSlides } from '../src/lib/slideParser.ts'
import { normalizeSlideTheme } from '../src/lib/slideThemes.ts'
import {
  normalizePresentationTemplate, inferSlideKind, layoutPresentation, visualThemeForSlide,
  configFromSnapshot, presentationApplyPatch, BUILTIN_PRESENTATION_TEMPLATES
} from '../src/features/templates/model.ts'

const file='https://devproject.supabase.co/storage/v1/object/public/slide-theme-backgrounds/example/banner.png'
test('F3: snapshots F2 versionados são migrados em memória sem descartar regras',()=>{
  const legacy={schemaVersion:1,theme:{background:'#123456',foreground:'#FFFFFF',accent:'#AABBCC'},
    layouts:{cover:'default',content:'center',exercise:'split'},
    footer:{text:'Escola',showPageNumber:false}}
  const result=normalizePresentationTemplate(legacy)
  assert.equal(result.schemaVersion,2)
  assert.equal(result.layouts.cover,'default')
  assert.equal(result.layouts.content,'center')
  assert.equal(result.layouts.exercise,'split')
  assert.equal(result.layouts.quote,'center')
  assert.equal(result.layouts.comparison,'default')
  assert.equal(result.footer.text,'Escola')
  assert.equal(result.footer.showPageNumber,false)
  assert.equal(result.theme.background,'#123456')
  assert.equal(result.branding.showHeader,false)
  assert.equal(result.density,'balanced')
  assert.deepEqual(normalizePresentationTemplate(result),result)
})
test('F3: estrutura do slide identifica imagem, citação, lista, tabela e encerramento',()=>{
  const source='# Introdução\n\nBem-vindos.\n## Conteúdo\n\nExplicando um conceito\n## Lista\n\n- Um\n- Dois\n## Citação\n\n> Uma ideia\n## Imagem\n\n![desenho](https://example.com/image.png)\n## Tabela\n\n| A | B |\n| --- | --- |\n| x | y |\n## Conclusão\n\nObrigado.'
  const slides=parseSlides(source)
  assert.deepEqual(slides.map(inferSlideKind),[
    'cover','content','list','quote','image','comparison','closing'
  ])
})
test('F3: exercício tem prioridade sobre capa e templates respeitam diretivas manuais',()=>{
  const markdown='# Título\n:::exercise\nPergunta\n:::\n\n<!-- slide: layout=split -->\n## Título manual\nConteúdo'
  const original=parseSlides(markdown)
  assert.equal(inferSlideKind(original[0],0),'exercise')
  const config=normalizePresentationTemplate({layouts:{exercise:'center',content:'center'}})
  const presented=layoutPresentation(original,config)
  assert.equal(presented[0].layout,'center')
  assert.equal(presented[1].layout,'split')
  assert.deepEqual(original.map(x=>x.markdown),presented.map(x=>x.markdown))
  assert.deepEqual(original.map(x=>x.answer),presented.map(x=>x.answer))
  assert.deepEqual(original.map(x=>x.id),presented.map(x=>x.id))
})
test('F3: marca e imagem de capa são limitadas a fontes seguras',()=>{
  const template=normalizePresentationTemplate({
    branding:{showHeader:true,label:'a'.repeat(100),logoUrl:file,logoAlignment:'right',accentRule:true},
    cover:{backgroundImage:file,overlayOpacity:4},density:'compact'
  })
  assert.equal(template.branding.label.length,50)
  assert.equal(template.branding.logoUrl,file)
  assert.equal(template.branding.logoAlignment,'right')
  assert.equal(template.branding.accentRule,true)
  assert.equal(template.cover.backgroundImage,file)
  assert.equal(template.cover.overlayOpacity,.85)
  assert.equal(template.density,'compact')
  const unsafe=normalizePresentationTemplate({branding:{logoUrl:'javascript:alert(1)'},cover:{backgroundImage:'data:image/svg+xml,evil'}})
  assert.equal(unsafe.branding.logoUrl,undefined)
  assert.equal(unsafe.cover.backgroundImage,undefined)
  assert.equal(unsafe.branding.logoAlignment,'left')
  assert.equal(unsafe.density,'balanced')
})
test('F3: fundo da capa não é aplicado em outros tipos de slide',()=>{
  const theme=normalizeSlideTheme({background:'#AABBCC'})
  const template=normalizePresentationTemplate({theme,cover:{backgroundImage:file,overlayOpacity:.62}})
  const cover=visualThemeForSlide(template,template.theme,'cover')
  const content=visualThemeForSlide(template,template.theme,'content')
  assert.equal(cover.backgroundMode,'image')
  assert.equal(cover.backgroundImage,file)
  assert.equal(cover.overlayOpacity,.62)
  assert.deepEqual(content,template.theme)
})
test('F3: todos os templates internos e snapshots preservam composição',()=>{
  assert.equal(BUILTIN_PRESENTATION_TEMPLATES.length,6)
  for(const choice of BUILTIN_PRESENTATION_TEMPLATES){
    const patch=presentationApplyPatch(choice)
    const loaded=configFromSnapshot(patch.presentation_template_snapshot)
    assert.ok(loaded)
    assert.equal(loaded.schemaVersion,2)
    assert.deepEqual(loaded,normalizePresentationTemplate(choice.config))
    assert.deepEqual(patch.theme_config,loaded.theme)
    assert.equal(Object.hasOwn(patch,'markdown'),false)
  }
})
test('F3: regras inválidas recebem fallback e strings de marca têm limite',()=>{
  const config=normalizePresentationTemplate({
    layouts:{cover:'javascript',image:'inside',list:'center',closing:'split'},
    density:'giant',footer:{text:'x'.repeat(1000),showPageNumber:false},
    branding:{showHeader:'true',accentRule:1,label:'A'.repeat(70)}
  })
  assert.equal(config.layouts.cover,'center')
  assert.equal(config.layouts.image,'split')
  assert.equal(config.layouts.list,'center')
  assert.equal(config.layouts.closing,'split')
  assert.equal(config.branding.label.length,50)
  assert.equal(config.branding.showHeader,false)
  assert.equal(config.footer.text.length,80)
  assert.equal(config.footer.showPageNumber,false)
})
