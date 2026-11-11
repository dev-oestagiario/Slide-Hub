import test from 'node:test'
import assert from 'node:assert/strict'
import {
  nextSlide,previousSlide,firstSlide,lastSlide,presentationKeyAction
} from '../src/lib/presentationNavigation.ts'

test('F5: navigation stays within the number of generated slides',()=>{
  assert.equal(nextSlide(2,3),2)
  assert.equal(nextSlide(0,3),1)
  assert.equal(nextSlide(0,0),0)
  assert.equal(previousSlide(0),0)
  assert.equal(previousSlide(2),1)
  assert.equal(firstSlide(),0)
  assert.equal(lastSlide(3),2)
  assert.equal(lastSlide(0),0)
})
test('F5: keyboard shortcuts have deterministic semantics',()=>{
  for(const k of ['ArrowRight','ArrowDown','PageDown',' '])assert.equal(presentationKeyAction(k),'next')
  for(const k of ['ArrowLeft','ArrowUp','PageUp'])assert.equal(presentationKeyAction(k),'previous')
  assert.equal(presentationKeyAction('Home'),'first')
  assert.equal(presentationKeyAction('End'),'last')
  assert.equal(presentationKeyAction('?'),'help')
  assert.equal(presentationKeyAction('h'),'help')
  assert.equal(presentationKeyAction('O'),'outline')
  assert.equal(presentationKeyAction('f'),'fullscreen')
  assert.equal(presentationKeyAction('Escape'),null)
  assert.equal(presentationKeyAction('Tab'),null)
})
