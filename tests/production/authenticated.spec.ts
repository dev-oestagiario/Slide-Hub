import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'

function required(key:string){
 const value=process.env[key]
 if(!value)throw Error('Configure the authorized QA environment variable '+key)
 return value
}
type LessonRow={id:string;title:string;markdown:string;status:string}
type Session={rows:LessonRow[];origin:string;headers:Record<string,string>}
async function login(page:Page,email:string,password:string):Promise<Session>{
 await page.goto('./',{waitUntil:'domcontentloaded'})
 await page.getByLabel('E-mail',{exact:true}).fill(email)
 await page.getByLabel('Senha',{exact:true}).fill(password)
 const response=page.waitForResponse(r=>r.url().includes('/rest/v1/rpc/list_accessible_lessons')&&r.request().method()==='POST')
 await page.getByRole('button',{name:'Entrar',exact:true}).click()
 const result=await response
 expect(result.status()).toBe(200)
 const headers=await result.request().allHeaders()
 expect(Boolean(headers.authorization&&headers.apikey)).toBe(true)
 return {rows:await result.json(),origin:new URL(result.url()).origin,headers:{authorization:headers.authorization,apikey:headers.apikey}}
}
async function readRows(page:Page,session:Session,table:'profiles'|'lessons'|'lesson_blocks'|'speaker_notes',params:Record<string,string>):Promise<Record<string,unknown>[]>{
 const url=new URL('/rest/v1/'+table,session.origin)
 for(const [key,value] of Object.entries(params))url.searchParams.set(key,value)
 const response=await page.request.get(url.toString(),{headers:session.headers})
 expect(response.status()).toBe(200)
 return await response.json()
}
test('authorized QA accounts: owner/student projection, direct RLS and account switch',async({page})=>{
 const title=required('SLIDEHUB_QA_LESSON_TITLE')
 const marker=required('SLIDEHUB_QA_PRIVATE_MARKER')
 const teacherEmail=required('SLIDEHUB_QA_TEACHER_EMAIL')
 const studentEmail=required('SLIDEHUB_QA_STUDENT_EMAIL')
 expect(teacherEmail.trim().toLowerCase()!==studentEmail.trim().toLowerCase()).toBe(true)
 const teacher=await login(page,teacherEmail,required('SLIDEHUB_QA_TEACHER_PASSWORD'))
 const teacherProfiles=await readRows(page,teacher,'profiles',{select:'id,role'})
 expect(teacherProfiles.length).toBe(1)
 expect(teacherProfiles[0]?.role).toBe('teacher')
 const matching=teacher.rows.filter(l=>l.title===title)
 expect(matching.length).toBe(1)
 const owner=matching[0]
 expect(owner?.status).toBe('published')
 expect(owner?.markdown.includes(marker)).toBe(true)
 const rawOwner=await readRows(page,teacher,'lessons',{select:'id,markdown',id:'eq.'+owner.id})
 expect(rawOwner.length).toBe(1)
 expect(typeof rawOwner[0]?.markdown==='string'&&rawOwner[0].markdown.includes(marker)).toBe(true)
 await page.getByRole('button',{name:'Sair da conta'}).click()
 await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible()
 const student=await login(page,studentEmail,required('SLIDEHUB_QA_STUDENT_PASSWORD'))
 const studentProfiles=await readRows(page,student,'profiles',{select:'id,role'})
 expect(studentProfiles.length).toBe(1)
 expect(studentProfiles[0]?.role).toBe('student')
 expect(studentProfiles[0]?.id!==teacherProfiles[0]?.id).toBe(true)
 const visible=student.rows.find(l=>l.id===owner.id)
 expect(Boolean(visible)).toBe(true)
 expect(visible?.status).toBe('published')
 expect(JSON.stringify(visible).includes(marker)).toBe(false)
 expect((await readRows(page,student,'lessons',{select:'id',id:'eq.'+owner.id})).length).toBe(0)
 for(const table of ['lesson_blocks','speaker_notes'] as const){
  expect((await readRows(page,student,table,{select:'lesson_id',lesson_id:'eq.'+owner.id})).length).toBe(0)
 }
 await page.getByRole('button',{name:'Sair da conta'}).click()
 await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible()
})
