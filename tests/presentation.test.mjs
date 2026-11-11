import test from 'node:test'
import assert from 'node:assert/strict'
import { nextSlide, previousSlide } from '../src/lib/presentationNavigation.ts'
import { parseSlides } from '../src/lib/slideParser.ts'

test('slide seguinte e anterior respeitam os limites', () => {
  assert.equal(nextSlide(0, 3), 1)
  assert.equal(nextSlide(2, 3), 2)
  assert.equal(previousSlide(0), 0)
  assert.equal(previousSlide(2), 1)
})

test('um clique usa conteúdo Markdown atualizado, sem salvar', () => {
  const initial = '# Aula\n## Um'
  const edited = initial + '\n## Dois\nTexto novo'
  assert.equal(parseSlides(initial).length, 2)
  const slides = parseSlides(edited)
  assert.equal(slides.length, 3)
  assert.match(slides[2].markdown, /Texto novo/)
})

test('gabarito fica separado do corpo de texto projetado', () => {
  const [slide] = parseSlides('# Pergunta\n:::exercise\nQuestão?\n:::\n:::answer\nResposta correta\n:::')
  assert.equal(slide.answer, 'Resposta correta')
  assert.doesNotMatch(slide.markdown, /Resposta correta/)
})
