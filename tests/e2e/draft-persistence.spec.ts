import {test,expect} from '@playwright/test'
import type {Page} from '@playwright/test'
const key='slidehub:offline-draft:v1:qa-teacher:qa-lesson'
const original='# Aula QA\n\nTexto original.'
const changed='# Aula QA\n\nTexto editado.'
const fixture='/tests/e2e/draft-persistence.html'
const cached=(page:Page)=>page.evaluate(k=>localStorage.getItem(k),key)
async function mock(page:Page,mode:'success'|'failure'|'conflict'){
 const writes:{revision:string|null;markdown:string}[]=[]
 await page.route('**/rest/v1/lessons?*',async route=>{
  const req=route.request(),url=new URL(req.url())
  if(url.origin!=='http://127.0.0.1:4173'||req.method()!=='PATCH'){await route.abort();return}
  const patch=req.postDataJSON()
  writes.push({revision:url.searchParams.get('editor_revision'),markdown:patch.markdown})
  if(mode==='failure'){await route.fulfill({status:503,json:{message:'Falha de rede QA'}});return}
  if(mode==='conflict'){await route.fulfill({status:200,json:null});return}
  await route.fulfill({status:200,json:{...patch,id:'qa-lesson',module_id:'qa-module',status:'draft',position:0,template_id:null,editor_revision:3}})
 })
 return writes
}
test('F17.3: autosave sends the expected revision and removes the saved draft',async({page})=>{
 const writes=await mock(page,'success')
 await page.goto(fixture)
 const text=page.getByRole('textbox',{name:'Texto da aula'})
 await expect(text).toHaveValue(original)
 await text.fill(changed)
 await expect(page.getByLabel('Revisão')).toHaveText('3')
 await expect(page.getByLabel('Estado')).toHaveText('saved')
 expect(writes).toEqual([{revision:'eq.2',markdown:changed}])
 await expect.poll(()=>cached(page)).toBeNull()
})
test('F17.3: network failure preserves the draft and permits recovery after reload',async({page})=>{
 await mock(page,'failure')
 await page.goto(fixture)
 const text=page.getByRole('textbox',{name:'Texto da aula'})
 await text.fill(changed)
 await expect(page.getByLabel('Estado')).toHaveText('error')
 await expect.poll(async()=>JSON.parse((await cached(page))||'{}').markdown).toBe(changed)
 page.once('dialog',dialog=>dialog.accept())
 await page.reload()
 await expect(text).toHaveValue(changed)
})
test('F17.3: revision conflict preserves local text and leaves server revision unchanged',async({page})=>{
 const writes=await mock(page,'conflict')
 await page.goto(fixture)
 const text=page.getByRole('textbox',{name:'Texto da aula'})
 await text.fill(changed)
 await expect(page.getByLabel('Estado')).toHaveText('error')
 await expect(page.getByLabel('Aviso')).toContainText('Conflito')
 await expect(page.getByLabel('Revisão')).toHaveText('2')
 await expect(text).toHaveValue(changed)
 expect(writes).toEqual([{revision:'eq.2',markdown:changed}])
 await expect.poll(async()=>JSON.parse((await cached(page))||'{}').markdown).toBe(changed)
})
test('F17.3: undo back to baseline clears obsolete local draft',async({page})=>{
 await mock(page,'failure')
 await page.goto(fixture)
 const text=page.getByRole('textbox',{name:'Texto da aula'})
 await text.fill(changed)
 await expect(page.getByLabel('Estado')).toHaveText('error')
 await page.getByRole('button',{name:'Desfazer'}).click()
 await expect(text).toHaveValue(original)
 await expect(page.getByLabel('Alterações')).toHaveText('limpas')
 await expect.poll(()=>cached(page),{timeout:3000}).toBeNull()
 await expect(page.getByLabel('Estado')).toHaveText('saved')
})
