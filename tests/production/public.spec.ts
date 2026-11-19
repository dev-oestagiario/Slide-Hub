import {test,expect} from '@playwright/test'
import {releaseMatches} from '../../scripts/release-manifest.mjs'

test('public production: assets, login form and responsive signup navigation',async({page})=>{
 const errors:string[]=[],failedAssets:(number|string)[]=[]
 page.on('pageerror',()=>errors.push('JavaScript runtime error'))
 page.on('response',r=>{
  if(r.url().startsWith('https://dev-oestagiario.github.io/Slide-Hub/')&&r.status()>=400)failedAssets.push(r.status())
 })
 page.on('requestfailed',r=>{
  if(r.url().startsWith('https://dev-oestagiario.github.io/Slide-Hub/'))failedAssets.push('requestfailed')
 })
 const response=await page.goto('./',{waitUntil:'domcontentloaded'})
 expect(response?.status()).toBe(200)
 await expect(page.getByRole('heading',{name:'SlideHub',exact:true})).toBeVisible()
 await expect(page.getByLabel('E-mail',{exact:true})).toBeVisible()
 await expect(page.getByLabel('Senha',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true)
 await page.getByRole('button',{name:'Criar conta',exact:true}).click()
 await expect(page.getByRole('button',{name:'Já tenho conta',exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true)
 await page.getByRole('button',{name:'Já tenho conta',exact:true}).click()
 await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true)
 expect(failedAssets).toEqual([])
 expect(errors).toEqual([])
})

test('public production: published release matches the successful deploy',async({request})=>{
 const expected=process.env.EXPECTED_RELEASE_SHA
 test.skip(!expected,'Only verify release identity after a successful deploy')
 expect(expected).toMatch(/^[a-f0-9]{40}$/)
 await expect.poll(async()=>{
  try{
   const nonce='?qa='+Date.now()
   const manifest=await request.get('./release.json'+nonce,{timeout:5000})
   const index=await request.get('./'+nonce,{timeout:5000})
   if(!manifest.ok()||!index.ok())return false
   return releaseMatches(await manifest.json(),expected,await index.body())
  }catch{return false}
 },{timeout:45000,intervals:[1000,2000,5000]}).toBe(true)
})