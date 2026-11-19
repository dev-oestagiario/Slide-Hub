import {test,expect} from '@playwright/test'
test('F17.5: Mermaid renders flowchart and sequence, reports an invalid diagram',async({page})=>{
 const errors:string[]=[]
 page.on('pageerror',()=>errors.push('runtime error'))
 await page.goto('/tests/e2e/mermaid-render.html')
 const flow=page.getByRole('region',{name:'Fluxograma'})
 await expect(flow.locator('.mermaid-diagram svg')).toBeVisible()
 await expect(flow.locator('svg')).toContainText('Início')
 await expect(flow.locator('svg')).toContainText('Fim')
 const sequence=page.getByRole('region',{name:'Sequência'})
 await expect(sequence.locator('.mermaid-diagram svg')).toBeVisible()
 await expect(sequence.locator('svg')).toContainText('Professor')
 await expect(sequence.locator('svg')).toContainText('Aluno')
 await expect(page.getByRole('region',{name:'Inválido'}).getByRole('alert')).toContainText('Não foi possível renderizar')
 expect(errors).toEqual([])
})
