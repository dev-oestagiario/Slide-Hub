import test from 'node:test'
import assert from 'node:assert/strict'
import {cleanMotion,timeline,elementPhase,nextDelay,estimatedDuration,copyMotion,motionEqual} from '../src/features/editor/motionModel.ts'
const blocks=[{id:'block-0001'},{id:'block-0002'}]
const motion=cleanMotion({elements:{'block-0001':{effect:'fade',order:2,duration:350,delay:200,exit:'zoom',exitDuration:400,exitOrder:1},'block-0002':{effect:'rise',order:1,duration:200,exit:'fade',exitOrder:2}},transitions:{'block-0001':'slide'},timings:{'block-0001':{hold:1000,transitionDuration:250},orphan:{hold:2}}},blocks)
test('entrances then exits, with reversible phases and independent exit order',()=>{
 const events=timeline(blocks,motion)
 assert.deepEqual(events.map(e=>[e.id,e.kind]),[['block-0002','enter'],['block-0001','enter'],['block-0001','exit'],['block-0002','exit']])
 assert.equal(elementPhase(events,0,'block-0001'),'waiting')
 assert.equal(elementPhase(events,2,'block-0001'),'entered')
 assert.equal(elementPhase(events,3,'block-0001'),'exited')
 assert.equal(elementPhase(events,2,'block-0001'),'entered')
})
test('automatic schedule holds content before exits and respects all durations',()=>{
 const events=timeline(blocks,motion),timing=motion.timings['block-0001']
 assert.equal(nextDelay(events,0,timing,true),250)
 assert.equal(nextDelay(events,1,timing,true),400)
 assert.equal(nextDelay(events,2,timing,true),1350)
 assert.equal(nextDelay(events,3,timing,true),400)
 assert.equal(nextDelay(events,4,timing,true),350)
 assert.equal(estimatedDuration(events,timing,true),2750)
 assert.equal(nextDelay([],0,timing,false),1000)
})
test('timings normalize, duplicate and participate in equality',()=>{
 assert.deepEqual(Object.keys(motion.timings),['block-0001'])
 assert.deepEqual(copyMotion(motion,'block-0001','block-0003').timings['block-0003'],motion.timings['block-0001'])
 assert.equal(motionEqual(motion,{...motion,timings:{}}),false)
 const fixed=cleanMotion({elements:{'block-0001':{effect:'fade',delay:99999,exit:'unknown'}},timings:{'block-0001':{hold:1,transitionDuration:9999}}},blocks)
 assert.equal(fixed.elements['block-0001'].delay,30000)
 assert.equal(fixed.elements['block-0001'].exit,undefined)
 assert.deepEqual(fixed.timings['block-0001'],{hold:500,transitionDuration:2000})
})
