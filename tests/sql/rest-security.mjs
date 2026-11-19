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

 // F17.4: exercise all ownership boundaries against populated fixtures.
const patchOptions=body=>({method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(body)})
const postOptions=body=>({...patchOptions(body),method:'POST'})
const deleteOptions={method:'DELETE',headers:{Prefer:'return=representation'}}
const hidden=async(path,sub)=>{
 const result=await request(path,sub)
 assert.equal(result.status,200,path)
 assert.deepEqual(result.data,[],path)
}
const blocked=async(path,sub,options)=>{
 const result=await request(path,sub,options)
 assert.ok(result.status===403||(result.status===200&&Array.isArray(result.data)&&result.data.length===0),path+' should be denied, got '+result.status)
}
const owned=async(table,sub,id)=>{
 const result=await request('/'+table+'?select=id',sub)
 assert.equal(result.status,200,table)
 assert.deepEqual(result.data,[{id}],table)
}
for(const [sub,role] of [[owner,'teacher'],[student,'student'],[other,'teacher']]){
 const p=await request('/profiles?select=id,role',sub)
 assert.equal(p.status,200)
 assert.deepEqual(p.data,[{id:sub,role}])
}
await blocked('/profiles?id=eq.'+student,student,patchOptions({role:'teacher'}))
assert.deepEqual((await request('/profiles?select=role',student)).data,[{role:'student'}])
const publicDiscipline='20000000-0000-0000-0000-000000000001'
const privateDiscipline='20000000-0000-0000-0000-000000000002'
const publicModule='30000000-0000-0000-0000-000000000001'
const privateModule='30000000-0000-0000-0000-000000000002'
for(const sub of [student,other]){
 await owned('disciplines',sub,publicDiscipline)
 await owned('modules',sub,publicModule)
 await hidden('/disciplines?id=eq.'+privateDiscipline,sub)
 await hidden('/modules?id=eq.'+privateModule,sub)
 await hidden('/lesson_blocks?lesson_id=eq.'+lesson,sub)
 await blocked('/disciplines?id=eq.'+publicDiscipline,sub,patchOptions({title:'QA denied'}))
 await blocked('/modules?id=eq.'+publicModule,sub,deleteOptions)
 await blocked('/speaker_notes?lesson_id=eq.'+lesson,sub,patchOptions({notes:'QA denied'}))
 await blocked('/lesson_blocks?lesson_id=eq.'+lesson,sub,deleteOptions)
}
await blocked('/disciplines',student,postOptions({title:'QA denied',owner_id:student}))
await blocked('/lessons',other,postOptions({title:'QA denied',module_id:publicModule}))
for(const [table,prefix] of [['slide_templates','5'],['presentation_templates','6']]){
 const ownerTemplate=prefix+'0000000-0000-0000-0000-000000000001'
 const peerTemplate=prefix+'0000000-0000-0000-0000-000000000003'
 await owned(table,owner,ownerTemplate)
 await owned(table,other,peerTemplate)
 await hidden('/'+table+'?select=id',student)
 await blocked('/'+table+'?id=eq.'+ownerTemplate,other,patchOptions({name:'QA denied'}))
 await blocked('/'+table+'?id=eq.'+peerTemplate,owner,deleteOptions)
 await blocked('/'+table,student,postOptions({name:'QA denied',owner_id:student}))
}
const foreignTemplate=await request('/lessons?id=eq.'+lesson,owner,patchOptions({presentation_template_id:'60000000-0000-0000-0000-000000000003'}))
assert.equal(foreignTemplate.status,400)
assert.equal(foreignTemplate.data.code,'23514')
const ownTemplate=await request('/lessons?id=eq.'+lesson,owner,patchOptions({presentation_template_id:'60000000-0000-0000-0000-000000000001'}))
assert.equal(ownTemplate.status,200)
assert.equal(ownTemplate.data.length,1)
assert.equal(ownTemplate.data[0].presentation_template_id,'60000000-0000-0000-0000-000000000001')
assert.equal((await request('/lesson_blocks?lesson_id=eq.'+lesson,owner)).data.length,1)
assert.equal((await request('/speaker_notes?lesson_id=eq.'+lesson,owner)).data.length,1)
assert.equal((await list(student)).data[0].title,'Aula salva pela API')
console.log('F17.4 HTTP: profile roles, private disciplines/modules/templates, notes and blocks, ownership and denied writes passed')
