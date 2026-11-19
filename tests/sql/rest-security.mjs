import assert from 'node:assert/strict'
import {createHmac} from 'node:crypto'
const base=process.env.TEST_POSTGREST_URL??'http://127.0.0.1:3000'
const key=process.env.TEST_JWT_SECRET
if(!key)throw Error('Missing isolated CI JWT secret')
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url')
const token=sub=>{
 const body=encode({alg:'HS256',typ:'JWT'})+'.'+encode({role:'authenticated',sub,exp:Math.floor(Date.now()/1000)+600})
 return body+'.'+createHmac('sha256',key).update(body).digest('base64url')
}
const owner='10000000-0000-0000-0000-000000000001'
const student='10000000-0000-0000-0000-000000000002'
const other='10000000-0000-0000-0000-000000000003'
const lesson='40000000-0000-0000-0000-000000000001'
async function request(path,sub,options={}){
 const headers={...(sub?{Authorization:'Bearer '+token(sub)}:{}),...options.headers}
 const r=await fetch(base+path,{...options,headers})
 const content=await r.text()
 let data;try{data=JSON.parse(content)}catch{data=content}
 return {status:r.status,data}
}
for(let attempt=0;attempt<30;attempt++){
 try{const r=await request('/rpc/list_accessible_lessons',student,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(r.status===200)break}catch{}
 if(attempt===29)throw Error('PostgREST did not start')
 await new Promise(r=>setTimeout(r,1000))
}
const list=sub=>request('/rpc/list_accessible_lessons',sub,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})
for(const sub of [student,other]){
 const publicRows=await list(sub)
 assert.equal(publicRows.status,200)
 assert.equal(publicRows.data.length,1)
 assert.equal(publicRows.data[0].id,lesson)
 assert.doesNotMatch(JSON.stringify(publicRows.data),/SEGREDO_/)
 assert.match(publicRows.data[0].markdown,/Texto público/)
 assert.equal(publicRows.data[0].editor_layout.overrides['block-0001'].style.color,'#123456')
 const direct=await request('/lessons?select=*',sub)
 assert.equal(direct.status,200);assert.deepEqual(direct.data,[])
 const notes=await request('/speaker_notes?select=*',sub)
 assert.equal(notes.status,200);assert.deepEqual(notes.data,[])
 const denied=await request('/lessons?id=eq.'+lesson,sub,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({title:'Tentativa'})})
 assert.ok(denied.status===403||(denied.status===200&&denied.data.length===0))
}
const anon=await list()
assert.ok([401,403,404].includes(anon.status))
const raw=await list(owner)
assert.equal(raw.status,200);assert.equal(raw.data.length,3)
const current=raw.data.find(x=>x.id===lesson)
assert.match(current.markdown,/SEGREDO_RESPOSTA/)
const notes=await request('/speaker_notes?select=*',owner)
assert.equal(notes.data.length,1)
const save=revision=>request('/lessons?id=eq.'+lesson+'&editor_revision=eq.'+revision,owner,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({title:'Aula salva pela API'})})
const saved=await save(current.editor_revision)
assert.equal(saved.status,200);assert.equal(saved.data.length,1)
assert.equal(saved.data[0].editor_revision,current.editor_revision+1)
const stale=await save(current.editor_revision)
assert.equal(stale.status,200);assert.deepEqual(stale.data,[])
assert.equal((await list(student)).data[0].title,'Aula salva pela API')
console.log('F17 HTTP: RPC, RLS, private notes, persistence and optimistic conflict passed')
