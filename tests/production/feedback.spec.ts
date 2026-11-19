import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {issueUrl} from '../../supabase/functions/_shared/feedback'

const apiOrigin='https://kbezscxuhqculdvraqun.supabase.co'
const endpoint=apiOrigin+'/functions/v1/teacher-feedback'
const siteOrigin='https://dev-oestagiario.github.io'

function required(key:string){
 const value=process.env[key]
 if(!value?.trim())throw Error('Configure a variável autorizada de QA: '+key)
 return value
}

async function login(page:Page,email:string,password:string,role:'student'|'teacher'){
 await page.goto('./',{waitUntil:'domcontentloaded'})
 await page.getByLabel('E-mail',{exact:true}).fill(email)
 await page.getByLabel('Senha',{exact:true}).fill(password)
 const response=page.waitForResponse(r=>r.url()===apiOrigin+'/rest/v1/rpc/list_accessible_lessons'&&r.request().method()==='POST')
 await page.getByRole('button',{name:'Entrar',exact:true}).click()
 const result=await response
 expect(result.status()).toBe(200)
 const h=await result.request().allHeaders()
 expect(Boolean(h.authorization&&h.apikey)).toBe(true)
 const headers={authorization:h.authorization,apikey:h.apikey,Origin:siteOrigin}
 const profiles=await page.request.get(apiOrigin+'/rest/v1/profiles?select=role',{headers})
 expect(profiles.status()).toBe(200)
 expect((await profiles.json()).map((row:{role:string})=>row.role)).toEqual([role])
 await expect(page.getByRole('button',{name:'Sair da conta'})).toBeVisible()
 return headers
}

test('produção: professor e aluno, disponibilidade e criação de TF opt-in',async({page})=>{
 // Validate inputs before opening any page or issuing requests.
 const teacherEmail=required('SLIDEHUB_QA_TEACHER_EMAIL')
 const teacherPassword=required('SLIDEHUB_QA_TEACHER_PASSWORD')
 const studentEmail=required('SLIDEHUB_QA_STUDENT_EMAIL')
 const studentPassword=required('SLIDEHUB_QA_STUDENT_PASSWORD')
 expect(teacherEmail.trim().toLowerCase()!==studentEmail.trim().toLowerCase()).toBe(true)
 const create=process.env.SLIDEHUB_QA_CREATE_FEEDBACK_ISSUE==='true'
 let run=''
 if(create){
  if(process.env.GITHUB_EVENT_NAME!=='workflow_dispatch'||process.env.GITHUB_REF!=='refs/heads/main'||process.env.GITHUB_RUN_ATTEMPT!=='1')
   throw Error('Criação real somente em execução manual inicial na main; nunca em rerun.')
  run=required('GITHUB_RUN_ID')
  if(!/^\d+$/.test(run))throw Error('Identificador de execução inválido')
 }
 const studentHeaders=await login(page,studentEmail,studentPassword,'student')
 await expect(page.getByRole('button',{name:'Abrir TF'})).toHaveCount(0)
 const denied=await page.request.post(endpoint,{headers:studentHeaders,data:{action:'status'}})
 expect(denied.status()).toBe(403)
 await page.getByRole('button',{name:'Sair da conta'}).click()
 await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible()
 const teacherHeaders=await login(page,teacherEmail,teacherPassword,'teacher')
 const availability=page.waitForResponse(r=>r.url()===endpoint&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='status')
 await page.getByRole('button',{name:'Abrir TF'}).click()
 const ready=await availability
 expect(ready.status()).toBe(200)
 expect((await ready.json()).ready,'Integração indisponível: verificar configuração do segredo no Supabase.').toBe(true)
 const dialog=page.getByRole('dialog',{name:'Abrir TF'})
 await expect(dialog.getByLabel('Título')).toBeVisible()
 await expect(dialog.getByRole('button',{name:'Criar TF'})).toBeDisabled()
 if(!create){
  await dialog.getByRole('button',{name:'Cancelar'}).click()
  return
 }
 const title='[QA] Homologação TF — execução '+run
 await dialog.getByLabel('Título').fill(title)
 await dialog.getByLabel('Descrição').fill('Issue sintética de homologação autorizada. Nenhum dado de professor, aluno ou aula.')
 await dialog.getByLabel('Revisei o texto',{exact:false}).check()
 const result=page.waitForResponse(r=>r.url()===endpoint&&r.request().method()==='POST'&&Boolean(r.request().postDataJSON()?.requestId))
 await dialog.getByRole('button',{name:'Criar TF'}).click()
 const created=await result
 expect(created.status()).toBe(201)
 const receipt=await created.json()
 expect(Number.isSafeInteger(receipt.number)&&receipt.number>0).toBe(true)
 expect(receipt.url).toBe(issueUrl(receipt.number))
 await expect(dialog.getByRole('link',{name:'Acompanhar no GitHub'})).toHaveAttribute('href',receipt.url)
 // Retry the identical request only after a receipt exists: verifies idempotency.
 const retry=await page.request.post(endpoint,{headers:teacherHeaders,data:created.request().postDataJSON()})
 expect(retry.status()).toBe(200)
 expect(await retry.json()).toEqual(receipt)
 // Read only the known public issue; send no Supabase headers to GitHub.
 const issue=await page.request.get('https://api.github.com/repos/dev-oestagiario/Slide-Hub/issues/'+receipt.number,{headers:{Accept:'application/vnd.github+json'}})
 expect(issue.status()).toBe(200)
 expect((await issue.json()).title).toContain(title)
 console.log('Issue sintética confirmada: '+receipt.url)
 await dialog.getByRole('button',{name:'Concluir'}).click()
})
