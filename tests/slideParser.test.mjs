import test from 'node:test'
import assert from 'node:assert/strict'
import {parseSlides} from '../src/lib/slideParser.ts'
test('quebra em H2',()=>assert.equal(parseSlides('# Inicial\nTexto\n## Segunda seção\nTexto').length,2))
test('quebra explícita e atributos',()=>{
  const x=parseSlides('# Inicial\n<!-- slide: theme=dark layout=center -->\n# Outro')
  assert.equal(x.length,2); assert.equal(x[1].theme,'dark');assert.equal(x[1].layout,'center')
})
test('exercícios têm gabarito privado no render',()=>{
  const x=parseSlides('# Título\n:::exercise\nQuestão?\n:::\n:::answer\nSolução\n:::')
  assert.equal(x[0].exercise,true);assert.equal(x[0].answer,'Solução')
  assert.doesNotMatch(x[0].markdown,/Solução/)
})
test('H2 dentro de código não quebra slide',()=>{
  const c=String.fromCharCode(96).repeat(3)
  assert.equal(parseSlides('# Aula\n'+c+'md\n## literal\n'+c+'\n## segundo').length,2)
})
