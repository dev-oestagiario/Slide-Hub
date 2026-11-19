import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'

function required(key:string){
 const value=process.env[key]
 if(!value)throw Error('Configure the authorized QA environment variable '+key)
 return value
}
type LessonRow={id:string;title:string;markdown:string;status:string}
async function login(page:Page,email:string,password:string):Promise<LessonRow[]>{
 await page.goto('./',{waitUntil:'domcontentloaded'})
 await page.getByLabel('E-mail',{exact:true}).fill(email)
 await page.getByLabel('Senha',{exact:true}).fill(password)
 const response=page.waitForResponse(r=>r.url().includes('/rest/v1/rpc/list_accessible_lessons')&&r.request().method()==='POST')
 await page.getByRole('button',{name:'Entrar',exact:true}).click()
 const result=await response
 expect(result.status()).toBe(200)
 return await result.json()
}
test('authorized QA accounts: owner/student projection and account switch',async({page})=>{
 const title=required('SLIDEHUB_QA_LESSON_TITLE')
 const marker=required('SLIDEHUB_QA_PRIVATE_MARKER')
 const teacher=await login(page,required('SLIDEHUB_QA_TEACHER_EMAIL'),required('SLIDEHUB_QA_TEACHER_PASSWORD'))
 const owner=teacher.find(l=>l.title===title)
 // Boolean assertions avoid printing returned lesson content or the marker.
 expect(Boolean(owner)).toBe(true)
 expect(owner?.markdown.includes(marker)).toBe(true)
 await page.getByRole('button',{name:'Sair da conta'}).click()
 const student=await login(page,required('SLIDEHUB_QA_STUDENT_EMAIL'),required('SLIDEHUB_QA_STUDENT_PASSWORD'))
 const visible=student.find(l=>l.id===owner?.id)
 expect(Boolean(visible)).toBe(true)
 expect(visible?.status).toBe('published')
 expect(JSON.stringify(visible).includes(marker)).toBe(false)
 await page.getByRole('button',{name:'Sair da conta'}).click()
 await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible()
})
