import {test,expect} from '@playwright/test'

test('public production: assets, login form and responsive signup navigation',async({page})=>{
 const errors:string[]=[],failedAssets:number[]=[]
 page.on('pageerror',()=>errors.push('JavaScript runtime error'))
 page.on('response',r=>{
  if(r.url().startsWith('https://dev-oestagiario.github.io/Slide-Hub/')&&r.status()>=400)failedAssets.push(r.status())
 })
 const response=await page.goto('./',{waitUntil:'domcontentloaded'})
 expect(response?.status()).toBe(200)
 await expect(page.getByRole('heading',{name:'SlideHub',exact:true})).toBeVisible()
 await expect(page.getByLabel('E-mail',{exact:true})).toBeVisible()
 await expect(page.getByLabel('Senha',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Criar conta',exact:true}).click()
 await expect(page.getByRole('button',{name:'Já tenho conta',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Já tenho conta',exact:true}).click()
 await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true)
 expect(failedAssets).toEqual([])
 expect(errors).toEqual([])
})
