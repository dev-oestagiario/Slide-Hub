import {test,expect} from '@playwright/test'
test('professor opens TF and receives issue receipt, without visiting GitHub',async({page})=>{
 let count=0
 await page.route('**/functions/v1/teacher-feedback',async route=>{
  count++
  const data=route.request().postDataJSON()
  expect(data.title).toBe('Melhorar editor')
  expect(data.consent).toBe(true)
  expect(data.area).toBe('dashboard')
  expect(data).not.toHaveProperty('email')
  await route.fulfill({status:201,json:{number:42,url:'https://github.com/dev-oestagiario/Slide-Hub/issues/42'}})
 })
 await page.goto('/tests/e2e/feedback.html')
 await page.getByRole('button',{name:'Abrir TF'}).click()
 const dialog=page.getByRole('dialog',{name:'Abrir TF'})
 await expect(dialog.getByRole('button',{name:'Criar TF'})).toBeDisabled()
 await dialog.getByLabel('Título').fill('Melhorar editor')
 await dialog.getByLabel('Descrição').fill('Descrição sintética para teste.')
 await dialog.getByLabel('Revisei o texto',{exact:false}).check()
 await dialog.getByRole('button',{name:'Criar TF'}).click()
 await expect(dialog.getByRole('status')).toContainText('TF #42 criada com sucesso')
 await expect(dialog.getByRole('link',{name:'Acompanhar no GitHub'})).toHaveAttribute('href','https://github.com/dev-oestagiario/Slide-Hub/issues/42')
 await expect.poll(()=>count).toBe(1)
 await dialog.getByRole('button',{name:'Concluir'}).click()
 await expect(dialog).toHaveCount(0)
})
test('student does not see the feedback button',async({page})=>{
 await page.goto('/tests/e2e/feedback.html?role=student')
 await expect(page.getByRole('button',{name:'Abrir TF'})).toHaveCount(0)
})
test('error preserves input and retry uses the same receipt id',async({page})=>{
 const ids:string[]=[]
 await page.route('**/functions/v1/teacher-feedback',async route=>{
  ids.push(route.request().postDataJSON().requestId)
  await route.fulfill({status:ids.length===1?503:201,json:ids.length===1?{code:'unavailable'}:{number:42,url:'https://github.com/dev-oestagiario/Slide-Hub/issues/42'}})
 })
 await page.goto('/tests/e2e/feedback.html')
 await page.getByRole('button',{name:'Abrir TF'}).click()
 const dialog=page.getByRole('dialog',{name:'Abrir TF'})
 await dialog.getByLabel('Título').fill('Melhorar editor')
 await dialog.getByLabel('Descrição').fill('Descrição sintética para teste.')
 await dialog.getByLabel('Revisei o texto',{exact:false}).check()
 await dialog.getByRole('button',{name:'Criar TF'}).click()
 await expect(dialog.getByRole('alert')).toBeVisible()
 await expect(dialog.getByLabel('Título')).toHaveValue('Melhorar editor')
 await dialog.getByRole('button',{name:'Criar TF'}).click()
 await expect(dialog.getByRole('status')).toContainText('TF #42 criada')
 expect(ids.length).toBe(2);expect(ids[0]).toBe(ids[1])
})
