import test from 'node:test'
import assert from 'node:assert/strict'
import {applyMultiAction,moveSelection,setBlockRects} from '../src/features/editor/multiGeometry.ts'
import {normalizeRect,normalizeEditorLayout,layoutsEqual} from '../src/features/editor/layoutModel.ts'
const a={x:.1,y:.1,w:.1,h:.1,z:1},b={x:.3,y:.2,w:.1,h:.1,z:2},c={x:.7,y:.3,w:.1,h:.1,z:3}
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8)
test('group movement bounds all elements with a common delta',()=>{
 const moved=moveSelection({a,b,c},.8,.8)
 near(moved.c.x+moved.c.w,1);near(moved.c.y+moved.c.h,1)
 near(moved.b.x-moved.a.x,b.x-a.x)
 near(moved.c.y-moved.a.y,c.y-a.y)
})
test('alignment and equal spacing preserve sizes and layers',()=>{
 const aligned=applyMultiAction({a,b,c},'left')
 near(aligned.c.x,a.x)
 const distributed=applyMultiAction({a,b,c},'distributeX')
 near(distributed.b.x,.4);near(distributed.b.w,b.w)
 assert.equal(distributed.b.z,b.z)
})
test('lock prevents movement, grouping and rotation until explicitly unlocked',()=>{
 const locked=applyMultiAction({a,b},'lock')
 assert.equal(locked.a.locked,true)
 assert.deepEqual(moveSelection(locked,.1,.1),{})
 assert.deepEqual(applyMultiAction(locked,'left'),{})
 assert.deepEqual(applyMultiAction({a:locked.a},'rotateRight'),{})
 assert.deepEqual(applyMultiAction(locked,'unlock'),{a,b})
})
test('optional metadata round trips and does not alter old coordinates',()=>{
 assert.deepEqual(normalizeRect(a),a)
 const grouped=applyMultiAction({a,b},'group','group-12345678')
 assert.equal(grouped.a.group,'group-12345678')
 assert.deepEqual(applyMultiAction(grouped,'ungroup'),{a,b})
 const rotated=applyMultiAction({a},'rotateLeft')
 assert.equal(rotated.a.rotation,345)
 const layout=normalizeEditorLayout({blocks:[{id:'block-0001',markdown:'A',slideIndex:0}],overrides:{'block-0001':a}})
 const change=setBlockRects(layout,{'block-0001':{...a,rotation:345,locked:true}})
 assert.equal(layoutsEqual(layout,change),false)
 assert.deepEqual(normalizeEditorLayout(JSON.parse(JSON.stringify(change))),change)
})
