import test from 'node:test'
import assert from 'node:assert/strict'
import {snapGeometry,alignGeometry,fitImageGeometry,changeLayer,percentToRect,movingGuides} from '../src/features/editor/geometryTools.ts'

const a={x:.234,y:.36,w:.32,h:.23,z:2}
test('grid snapping and Alt free-move both respect canvas boundaries',()=>{
  const snapped=snapGeometry(a,'move',true)
  assert.equal(snapped.x,.24)
  assert.deepEqual(snapGeometry(a,'move',false),a)
  const near={...a,x:.91,y:.99}
  const constrained=snapGeometry(near,'move',true)
  assert.ok(constrained.x+constrained.w<=1)
  assert.ok(constrained.y+constrained.h<=1)
})
test('magnetic guides and alignment commands',()=>{
  const centered=snapGeometry({...a,x:.5-a.w/2+.005,y:.5-a.h/2+.004},'move')
  assert.ok(Math.abs(centered.x+centered.w/2-.5)<.00001)
  assert.deepEqual(movingGuides(centered),{vertical:true,horizontal:true})
  assert.equal(alignGeometry(a,'left').x,.06)
  assert.equal(alignGeometry(a,'centerX').x,(1-a.w)/2)
  assert.equal(alignGeometry(a,'bottom').y,1-.06-a.h)
})
test('inspector changes size, depth and fit-image with validated rectangles',()=>{
  const updated=percentToRect(a,'w',40)
  assert.equal(updated.w,.4)
  assert.equal(changeLayer(a,'backward').z,1)
  assert.equal(changeLayer({...a,z:100},'forward').z,100)
  assert.deepEqual(fitImageGeometry(a),{x:.12,y:.15,w:.76,h:.67,z:2})
  assert.deepEqual(percentToRect(a,'x',NaN),a)
})
