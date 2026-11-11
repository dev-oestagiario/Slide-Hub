import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSlides } from '../src/lib/slideParser.ts'
import { paginateSlides, flowPieces, estimatePiece } from '../src/features/editor/autoOrganizer.ts'
import { emptyLayout, reconcileEditorLayout } from '../src/features/editor/layoutModel.ts'

test('auto organizer retains one slide when image and short text fit',()=>{
  const slides=parseSlides('# Aula\n\n![Imagem](https://example.org/diagram.png)\n\nUma legenda pequena.')
  const result=paginateSlides(slides)
  assert.equal(result.length,1)
  assert.match(result[0].markdown,/Uma legenda pequena/)
})
test('auto organizer paginates oversized image + long lesson without dropping text',()=>{
  const text=Array.from({length:13},(_,i)=>'A explicação do assunto '+i+' descreve um conceito importante para a turma.').join('\n\n')
  const original=parseSlides('# Imagem e conteúdo\n\n![Figura](https://example.org/img.png)\n\n'+text)
  const result=paginateSlides(original)
  assert.ok(result.length>1)
  assert.equal(result[0].originalIndex,0)
  assert.ok(result.slice(1).every(s=>s.continuation))
  const joined=result.map(x=>x.markdown).join('\n\n')
  assert.equal(joined,original[0].markdown)
  assert.match(joined,/assunto 12/)
})
test('answer keys stay private even after an exercise is split across pages',()=>{
  const paragraphs=Array.from({length:14},(_,i)=>'Tópico de exercício '+i+' com um exemplo.').join('\n\n')
  const original=parseSlides('# Exercício\n\n:::exercise\n'+paragraphs+'\n:::\n\n:::answer\nGABARITO PRIVADO\n:::')
  const pages=paginateSlides(original)
  assert.ok(pages.length>1)
  assert.equal(pages[0].exercise,true)
  assert.equal(pages.at(-1).answer,'GABARITO PRIVADO')
  assert.ok(pages.slice(0,-1).every(x=>!x.answer))
  assert.ok(pages.every(x=>!x.markdown.includes('GABARITO PRIVADO')))
})
test('splits long lists at item boundaries and leaves fenced code intact',()=>{
  const list='- item\n'.repeat(16)
  const pieces=flowPieces(list)
  assert.ok(pieces.length>1)
  assert.equal(pieces.map(x=>x.markdown.split('\n').length).reduce((a,b)=>a+b),16)
  const ticks=String.fromCharCode(96).repeat(3)
  const code=ticks+'js\n'+Array.from({length:20},(_,i)=>'const n'+i+'=true').join('\n')+'\n'+ticks
  const parts=flowPieces(code)
  assert.equal(parts.length,1)
  assert.equal(parts[0].kind,'code')
  assert.ok(estimatePiece('code',code)>10)
})
test('original slide directive and identity are preserved until content requires more space',()=>{
  const source='# A\n\nTexto simples\n\n<!-- slide: layout=split -->\n## B\n\nConteúdo'
  const slides=parseSlides(source)
  const result=paginateSlides(slides)
  assert.equal(result.length,2)
  assert.equal(result[1].layout,'split')
  assert.deepEqual(result.map(x=>x.markdown),slides.map(x=>x.markdown))
})
test('original blocks keep stable keys after an automatic overflow adds a continuation',()=>{
  let number=0
  const id=()=>String(++number).padStart(8,'0')
  const first=paginateSlides(parseSlides('# Aula\n\nPrimeiro conceito\n\nSegundo conceito'))
  const firstLayout=reconcileEditorLayout(first,emptyLayout(),id)
  const second=paginateSlides(parseSlides('# Aula\n\nPrimeiro conceito\n\nSegundo conceito\n\n'+
    Array.from({length:20},(_,i)=>'Outro conceito '+i+'.').join('\n\n')))
  const nextLayout=reconcileEditorLayout(second,firstLayout,id)
  assert.equal(firstLayout.blocks.find(x=>x.markdown==='Primeiro conceito')?.id,
    nextLayout.blocks.find(x=>x.markdown==='Primeiro conceito')?.id)
})
