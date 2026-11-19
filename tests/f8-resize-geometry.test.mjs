import test from 'node:test'
import assert from 'node:assert/strict'
import {resizeGeometry,RESIZE_HANDLES} from '../src/features/editor/geometryTools.ts'

const start={x:.2,y:.2,w:.4,h:.3,z:3}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`)
test('F8: all eight handles keep the opposite edges fixed',()=>{
  assert.equal(RESIZE_HANDLES.length,8)
  for(const {id} of RESIZE_HANDLES){
    const r=resizeGeometry(start,id,.06,.04)
    if(id.includes('w'))near(r.x+r.w,start.x+start.w)
    else near(r.x,start.x)
    if(id.includes('n'))near(r.y+r.h,start.y+start.h)
    else near(r.y,start.y)
    if(!/[ew]/.test(id))near(r.w,start.w)
    if(!/[ns]/.test(id))near(r.h,start.h)
  }
})
test('F8: dragging past canvas bounds or minimum size remains anchored',()=>{
  const r=resizeGeometry(start,'nw',-2,-2)
  near(r.x,0);near(r.y,0)
  near(r.x+r.w,.6);near(r.y+r.h,.5)
  const small=resizeGeometry(start,'nw',2,2)
  near(small.w,.08);near(small.h,.05)
  near(small.x+small.w,.6);near(small.y+small.h,.5)
})
test('F8: corner resizing preserves proportions when requested',()=>{
  for(const id of ['nw','ne','sw','se']){
    const r=resizeGeometry(start,id,.1,.02,true,true)
    near(r.w/r.h,start.w/start.h)
    assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=1+1e-9&&r.y+r.h<=1+1e-9)
  }
})
test('F8: grid snapping anchors the stationary edge and invalid values do not change size',()=>{
  const r=resizeGeometry(start,'w',.037,0,true)
  near(r.x,.24);near(r.x+r.w,.6)
  assert.deepEqual(resizeGeometry(start,'e',NaN,0),start)
})
