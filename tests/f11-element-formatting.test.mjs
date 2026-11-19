import test from 'node:test'
import assert from 'node:assert/strict'
import {parseSlides} from '../src/lib/slideParser.ts'
import {paginateSlides} from '../src/features/editor/autoOrganizer.ts'
import {emptyLayout,reconcileEditorLayout,setBlockRect,normalizeRect,layoutsEqual} from '../src/features/editor/layoutModel.ts'
import {editVisibleBlock} from '../src/features/editor/sourceEdits.ts'
const source='# Aula\n\nTexto original.\n\n:::answer\nTexto original.\n:::'
const layout=()=>reconcileEditorLayout(paginateSlides(parseSlides(source)),emptyLayout())
test('inline editing updates source without changing a private identical answer or ID',()=>{
 const l=layout(), block=l.blocks[1]
 const pinned=setBlockRect(l,block.id,{x:.1,y:.2,w:.4,h:.2,z:2})
 const edit=editVisibleBlock(source,pinned,block.id,'Novo texto.',true,'edit')
 assert.ok(edit);assert.equal(parseSlides(edit.markdown)[0].answer,'Texto original.')
 assert.equal(edit.layout.blocks[1].id,block.id)
 assert.deepEqual(edit.layout.overrides[block.id],pinned.overrides[block.id])
})
test('duplicates create a distinct ID and copy style without grouping',()=>{
 const l=layout(),block=l.blocks[1]
 const r={x:.1,y:.2,w:.4,h:.2,z:2,group:'group-12345678',style:{color:'#123456'}}
 const edit=editVisibleBlock(source,setBlockRect(l,block.id,r),block.id,'',true,'duplicate')
 assert.ok(edit);assert.notEqual(edit.id,block.id)
 assert.equal(edit.layout.blocks[2].id,edit.id)
 assert.equal(edit.layout.overrides[edit.id].style.color,'#123456')
 assert.equal(edit.layout.overrides[edit.id].group,undefined)
})
test('unsafe structure and ambiguous repeated source are rejected',()=>{
 const l=layout();assert.equal(editVisibleBlock(source,l,l.blocks[1].id,':::answer\nTeste',true,'edit'),null)
 const repeated='Texto.\n\nTexto.'
 const r=reconcileEditorLayout(paginateSlides(parseSlides(repeated)),emptyLayout())
 assert.equal(editVisibleBlock(repeated,r,r.blocks[0].id,'',true,'duplicate'),null)
})
test('format style is whitelisted, bounded and round trips',()=>{
 const r={x:0,y:0,w:.5,h:.5,z:0}
 const styled=normalizeRect({...r,style:{font:'serif',size:900,color:'#AABBCC',opacity:0,background:'url(x)',imageFit:'cover',imageX:200}})
 assert.deepEqual(styled.style,{font:'serif',color:'#aabbcc',size:200,opacity:10,imageX:100,imageFit:'cover'})
 const l=layout();assert.equal(layoutsEqual(l,setBlockRect(l,l.blocks[0].id,styled)),false)
})
