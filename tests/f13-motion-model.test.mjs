import test from 'node:test'
import assert from 'node:assert/strict'
import {cleanMotion,revealOrder,copyMotion} from '../src/features/editor/motionModel.ts'
import {parseSlides} from '../src/lib/slideParser.ts'
import {paginateSlides} from '../src/features/editor/autoOrganizer.ts'
import {emptyLayout,reconcileEditorLayout,normalizeEditorLayout,layoutsEqual} from '../src/features/editor/layoutModel.ts'
import {changeSlide} from '../src/features/editor/slideOperations.ts'
test('motion normalization clamps values and rejects unknown effects and orphaned IDs',()=>{
 const blocks=[{id:'block-0001'},{id:'block-0002'},{id:'block-0003'}]
 const motion=cleanMotion({elements:{'block-0001':{effect:'fade',order:5,duration:90000},'block-0002':{effect:'rise',order:1,duration:0},'block-0003':{effect:'unknown'},orphan:{effect:'fade'}},transitions:{'block-0001':'slide',orphan:'zoom'}},blocks)
 assert.deepEqual(revealOrder(blocks,motion),['block-0002','block-0001'])
 assert.equal(motion.elements['block-0001'].duration,2000)
 assert.equal(motion.elements['block-0002'].duration,100)
 assert.deepEqual(motion.transitions,{'block-0001':'slide'})
 assert.equal(copyMotion(motion,'block-0001','block-0004').elements['block-0004'].effect,'fade')
})
test('drag reorder and duplicate preserve motion identity, private data and new IDs',()=>{
 const source='# A\n\nTexto A.\n\n:::answer\nPrivado\n:::\n\n<!-- slide -->\n## B\n\nTexto B.\n\n<!-- slide -->\n## C\n\nTexto C.'
 const parsed=paginateSlides(parseSlides(source))
 const layout=reconcileEditorLayout(parsed,emptyLayout())
 const id=layout.blocks[0].id
 layout.motion={elements:{[id]:{effect:'fade',order:1,duration:350}},transitions:{[id]:'zoom'}}
 assert.equal(layoutsEqual(layout,normalizeEditorLayout(JSON.parse(JSON.stringify(layout)))),true)
 assert.equal(layoutsEqual({...layout,motion:undefined},layout),false)
 const next=changeSlide(source,layout,2,true,{type:'reorder',fromPage:0,toPage:2})
 assert.ok(next);assert.equal(parseSlides(next.markdown)[2].answer,'Privado')
 assert.equal(next.layout.blocks[4].id,id);assert.equal(next.layout.motion.elements[id].effect,'fade')
 const copy=changeSlide(next.markdown,next.layout,2,true,{type:'duplicate'})
 assert.ok(copy);assert.equal(copy.layout.motion.elements[copy.layout.blocks[6].id].effect,'fade')
})
