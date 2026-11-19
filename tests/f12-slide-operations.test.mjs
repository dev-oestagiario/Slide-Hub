import test from 'node:test'
import assert from 'node:assert/strict'
import {parseSlides} from '../src/lib/slideParser.ts'
import {paginateSlides} from '../src/features/editor/autoOrganizer.ts'
import {emptyLayout,reconcileEditorLayout,setBlockRect} from '../src/features/editor/layoutModel.ts'
import {changeSlide,shapeMarkdown} from '../src/features/editor/slideOperations.ts'
const source='# A\n\nTexto A.\n\n:::answer\nPrivado A.\n:::\n\n<!-- slide: layout=split -->\n## B\n\nTexto B.'
const layout=()=>reconcileEditorLayout(paginateSlides(parseSlides(source)),emptyLayout())
test('move sections retains directives, private answers and original IDs',()=>{
 const l=layout(),r=changeSlide(source,l,1,true,{type:'move',direction:-1})
 assert.ok(r);const p=parseSlides(r.markdown);assert.equal(p[0].layout,'split')
 assert.equal(p[1].answer,'Privado A.');assert.equal(r.layout.blocks[0].id,l.blocks[2].id)
})
test('duplicate creates new IDs while preserving original geometry and answer',()=>{
 const l=layout(),id=l.blocks[0].id,pinned=setBlockRect(l,id,{x:.1,y:.2,w:.3,h:.2,z:3})
 const r=changeSlide(source,pinned,0,true,{type:'duplicate'})
 assert.ok(r);assert.equal(parseSlides(r.markdown)[1].answer,'Privado A.')
 assert.equal(r.layout.blocks[0].id,id);assert.notEqual(r.layout.blocks[2].id,id)
 assert.deepEqual(r.layout.overrides[r.layout.blocks[2].id],pinned.overrides[id])
})
test('append shape is visible and never enters private answer; malformed source refuses',()=>{
 const r=changeSlide(source,layout(),0,true,{type:'shape',shape:'arrow'})
 assert.ok(r);assert.ok(parseSlides(r.markdown)[0].markdown.includes(shapeMarkdown('arrow')))
 assert.equal(parseSlides(r.markdown)[0].answer,'Privado A.')
 const bad='# A\n\n:::answer\nPrivado'
 assert.equal(changeSlide(bad,reconcileEditorLayout(paginateSlides(parseSlides(bad)),emptyLayout()),0,true,{type:'shape',shape:'circle'}),null)
})
