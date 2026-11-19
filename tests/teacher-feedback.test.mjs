import test from 'node:test'
import assert from 'node:assert/strict'
import {parseFeedback,issuePayload,issueUrl} from '../supabase/functions/_shared/feedback.ts'
import {makeHandler} from '../supabase/functions/teacher-feedback/handler.ts'
const input={requestId:'00000000-0000-4000-8000-000000000001',category:'improvement',area:'editor',title:'Melhorar editor',description:'Texto sintético para teste.',consent:true}
const url='https://fixture.invalid/teacher-feedback'
const request=(body=input,token='teacher',origin='https://dev-oestagiario.github.io')=>new Request(url,{method:'POST',headers:{Authorization:'Bearer '+token,Origin:origin},body:JSON.stringify(body)})
const harness=(overrides={})=>{
 let calls=0;const claims=new Map()
 const handler=makeHandler({
  authenticate:async token=>token==='bad'?null:{id:token,role:token},
  configured:()=>true,
  claim:async(id,request)=>{const key=id+request;if(claims.has(key)){const number=claims.get(key);return number?{state:'sent',number}:{state:'pending'}}claims.set(key,0);return {state:'claimed'}},
  createIssue:async()=>{calls++;return 42},
  finish:async(id,request,number)=>{claims.set(id+request,number)},
  ...overrides
 })
 return {handler,calls:()=>calls}
}
test('validates fields and prevents unexpected payload keys',()=>{
 assert.ok(parseFeedback(input))
 for(const invalid of [{...input,consent:false},{...input,title:'  '},{...input,description:'x'.repeat(2001)},{...input,category:'unknown'},{...input,requestId:'invalid'},{...input,lessonId:'private'},{...input,title:'abc\ndef'}])assert.equal(parseFeedback(invalid),null)
})
test('issue text is literal, does not mention accounts, and omits teacher metadata',()=>{
 const data=issuePayload({...input,title:'Editor @teacher',description:'Primeira linha\n@teacher\n~~~'})
 assert.match(data.title,/＠teacher/)
 assert.match(data.body,/    ＠teacher/)
 assert.ok(!data.body.includes('@teacher'))
 assert.ok(!data.body.includes('user_id'))
 assert.ok(data.body.includes(input.requestId))
})
test('teacher and admin may send, successful retry uses receipt without duplicate',async()=>{
 const h=harness()
 const first=await h.handler(request())
 assert.equal(first.status,201)
 assert.deepEqual(await first.json(),{number:42,url:issueUrl(42)})
 assert.equal((await h.handler(request())).status,200)
 assert.equal(h.calls(),1)
 assert.equal((await h.handler(request(input,'admin'))).status,201)
 assert.equal(h.calls(),2)
})
test('rejects student, invalid auth, unauthorized origin, malformed input',async()=>{
 const h=harness()
 assert.equal((await h.handler(request(input,'student'))).status,403)
 assert.equal((await h.handler(request(input,'bad'))).status,401)
 assert.equal((await h.handler(request(input,'teacher','https://other.invalid'))).status,403)
 assert.equal((await h.handler(request({...input,consent:false}))).status,400)
 assert.equal((await h.handler(request({...input,description:'x'.repeat(17000)}))).status,413)
 assert.equal(h.calls(),0)
})
test('missing configuration and quota do not call GitHub',async()=>{
 assert.equal((await harness({configured:()=>false}).handler(request())).status,503)
 const h=harness({claim:async()=>({state:'limit'})})
 assert.equal((await h.handler(request())).status,429);assert.equal(h.calls(),0)
})
test('an uncertain GitHub response is not automatically retried',async()=>{
 let calls=0
 const h=harness({createIssue:async()=>{calls++;throw Error('timeout')}})
 assert.equal((await h.handler(request())).status,502)
 assert.equal((await h.handler(request())).status,409)
 assert.equal(calls,1)
})
