import test from 'node:test'
import assert from 'node:assert/strict'
import {resizeGroup,smartMove,rotateBy,angleAt} from '../src/features/editor/studioGeometry.ts'
const a={x:.1,y:.1,w:.2,h:.2,z:1},b={x:.4,y:.3,w:.2,h:.1,z:2,group:'group-12345678'}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8)
test('group resize scales relative positions and retains metadata',()=>{
 const r=resizeGroup({a,b},'se',.1,.06)
 near(r.a.x,a.x);near(r.a.y,a.y)
 near((r.b.x-r.a.x)/(b.x-a.x),r.a.w/a.w)
 near(r.b.h/b.h,r.a.w/a.w);assert.equal(r.b.group,b.group)
 const n=resizeGroup({a,b},'nw',-.8,-.8)
 near(n.b.x+n.b.w,b.x+b.w)
 assert.ok(n.a.x>=-1e-8&&n.a.y>=-1e-8)
})
test('locked or rotated groups cannot be resized',()=>{
 assert.deepEqual(resizeGroup({a:{...a,locked:true},b},'se',.1,.1),{})
 assert.deepEqual(resizeGroup({a:{...a,rotation:15},b},'se',.1,.1),{})
})
test('guide snaps nearest peer edge and preserves gaps in a selection',()=>{
 const result=smartMove({a,b},{c:{x:.72,y:.6,w:.1,h:.1,z:3}},.115,0,.01,.01)
 near(result.updates.b.x+result.updates.b.w,.72)
 near(result.updates.b.x-result.updates.a.x,b.x-a.x)
 assert.ok(result.guides.some(g=>g.axis==='x'&&Math.abs(g.value-.72)<1e-8))
})
test('rotation permits free angles and Shift snapping',()=>{
 assert.equal(rotateBy(a,32).rotation,32)
 assert.equal(rotateBy(a,32,true).rotation,30)
 assert.equal(rotateBy(a,-15).rotation,345)
 assert.equal(angleAt(0,1,0,0),90)
 assert.deepEqual(rotateBy({...a,locked:true},40),{...a,locked:true})
})
