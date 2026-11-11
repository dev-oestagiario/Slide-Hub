import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSlides, articleMarkdown } from '../src/lib/slideParser.ts'
import { hasUnsavedChanges } from '../src/lib/unsavedChanges.ts'

test('gabarito mantém cabeçalhos H2 e diretivas dentro da resposta privada',()=>{
  const source='# Aula\nTexto público\n:::answer\n## Resposta confidencial\n<!-- slide -->\nExplicação reservada\n:::\n## Próximo assunto\nConteúdo público'
  const slides=parseSlides(source)
  assert.equal(slides.length,2)
  assert.match(slides[0].answer,/Resposta confidencial/)
  assert.match(slides[0].answer,/Explicação reservada/)
  assert.ok(slides.every(slide=>!slide.markdown.includes('Resposta confidencial')))
  assert.ok(slides.every(slide=>!slide.markdown.includes('Explicação reservada')))
  assert.match(slides[1].markdown,/Próximo assunto/)
})

test('gabarito sem fechamento não vaza em novos slides ou na apostila',()=>{
  const source='# Aula\nConceito visível\n:::answer\n## Resposta que não pode aparecer\n<!-- slide -->\nSegredo'
  const slides=parseSlides(source)
  assert.equal(slides.length,1)
  assert.equal(slides[0].markdown,'# Aula\nConceito visível')
  assert.match(slides[0].answer,/Resposta que não pode aparecer/)
  const handout=articleMarkdown(source)
  assert.equal(handout,'# Aula\nConceito visível')
})

test('apostila remove respostas completas, exercícios são visíveis',()=>{
  const markdown='# Conteúdo\n:::exercise\nQual a resposta?\n:::\n:::answer\n42\n:::\n## Continuação\nTexto final'
  const handout=articleMarkdown(markdown)
  assert.match(handout,/Qual a resposta/)
  assert.match(handout,/Continuação/)
  assert.doesNotMatch(handout,/42|:::answer|:::exercise/)
})

test('marcadores de resposta e slides dentro de código são literais',()=>{
  const ticks='`'.repeat(3)
  const markdown='# Aula\n'+ticks+'md\n:::answer\n## Não quebrar\n<!-- slide -->\n'+ticks+'\n## Outra seção'
  const slides=parseSlides(markdown)
  assert.equal(slides.length,2)
  assert.match(slides[0].markdown,/:::answer/)
  assert.match(slides[0].markdown,/<!-- slide -->/)
  assert.match(articleMarkdown(markdown),/:::answer/)
})

test('código dentro de gabarito pode conter ::: sem fechar resposta',()=>{
  const fence='`'.repeat(3)
  const source='# Aula\n:::answer\n'+fence+'md\n:::\n'+fence+'\nAinda reservado\n:::\n## Público'
  const slides=parseSlides(source)
  assert.equal(slides.length,2)
  assert.match(slides[0].answer,/Ainda reservado/)
  assert.doesNotMatch(slides[0].markdown,/Ainda reservado/)
})

test('CRLF, quebras manuais e desativação de H2 preservam conteúdo',()=>{
  const markdown='# Aula\r\n## A\r\nTexto\r\n<!-- slide -->\r\n## B'
  const slides=parseSlides(markdown,false)
  assert.equal(slides.length,2)
  assert.match(slides[0].markdown,/## A/)
  assert.match(slides[1].markdown,/## B/)
})

test('apostila vazia não recebe placeholder de apresentação',()=>{
  assert.equal(articleMarkdown('   \n'), '')
  assert.equal(articleMarkdown(':::answer\nSegredo\n:::'), '')
})

test('alterações no título ou texto são detectadas e nenhum estado gera falso alerta',()=>{
  const saved={ title:'Aula', markdown:'# Texto', id:'id' }
  assert.equal(hasUnsavedChanges(saved,{title:'Aula',markdown:'# Texto'}),false)
  assert.equal(hasUnsavedChanges(saved,{title:'Aula alterada',markdown:'# Texto'}),true)
  assert.equal(hasUnsavedChanges(saved,{title:'Aula',markdown:'# Texto novo'}),true)
  assert.equal(hasUnsavedChanges(null,{title:'Novo',markdown:''}),false)
})
