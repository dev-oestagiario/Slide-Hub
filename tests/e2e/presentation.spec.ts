import { expect, test } from '@playwright/test'
const open=async(page:import('@playwright/test').Page,student=false)=>{
  await page.goto('/tests/e2e/presenter.html'+(student?'?student=1':''))
  const launcher=page.getByRole('button',{name:'Abrir apresentação'})
  await launcher.click()
  const dialog=page.getByRole('dialog',{name:'Apresentação da aula: Aula de teste'})
  await expect(dialog).toBeVisible()
  return {launcher,dialog}
}
const counter=(page:import('@playwright/test').Page)=>page.locator('.f5-presenter-controls [role="status"]')

test('navegar por teclado e pelo índice de slides sem perder o foco',async({page})=>{
  const {launcher,dialog}=await open(page)
  await expect(counter(page)).toHaveText('1 de 3')
  await page.keyboard.press('ArrowRight')
  await expect(counter(page)).toHaveText('2 de 3')
  await page.keyboard.press('End')
  await expect(counter(page)).toHaveText('3 de 3')
  await page.keyboard.press('Home')
  await expect(counter(page)).toHaveText('1 de 3')
  await page.keyboard.press('PageDown')
  await expect(counter(page)).toHaveText('2 de 3')
  await page.getByRole('button',{name:'Exibir lista de slides'}).click()
  const outline=page.getByRole('navigation',{name:'Navegação pelos slides'})
  await expect(outline).toBeVisible()
  await outline.getByRole('button',{name:/03.*Exercício/}).click()
  await expect(counter(page)).toHaveText('3 de 3')
  await expect(outline).not.toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(launcher).toBeFocused()
})

test('tab mantém o foco dentro da apresentação e Escape fecha primeiro a ajuda',async({page})=>{
  const {dialog}=await open(page)
  await expect(dialog).toBeFocused()
  await page.keyboard.press('?')
  await expect(page.getByLabel('Atalhos disponíveis')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('Atalhos disponíveis')).not.toBeVisible()
  for(let step=0;step<15;step++){
    await page.keyboard.press('Tab')
    const inside=await page.evaluate(()=>Boolean(document.activeElement?.closest('.f5-slideshow')))
    expect(inside).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

test('notas e gabaritos aparecem apenas nos controles do professor',async({page})=>{
  await open(page)
  await page.getByRole('button',{name:'Mostrar notas do professor'}).click()
  await expect(page.getByText('ANOTAÇÃO SOMENTE PROFESSOR')).not.toBeVisible()
  await page.keyboard.press('Escape')
  await open(page,true)
  await page.keyboard.press('End')
  await expect(page.getByRole('button',{name:'Revelar gabarito'})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Mostrar notas do professor'})).toHaveCount(0)
  await expect(page.getByText('RESPOSTA RESERVADA')).toHaveCount(0)
  await expect(page.getByText('ANOTAÇÃO SOMENTE PROFESSOR')).toHaveCount(0)
})
test('professor pode revelar solução e navegar sem propagá-la ao slide seguinte',async({page})=>{
  await open(page)
  await page.keyboard.press('End')
  await expect(page.getByRole('button',{name:'Revelar gabarito'})).toBeVisible()
  await expect(page.getByText('RESPOSTA RESERVADA')).toHaveCount(0)
  await page.getByRole('button',{name:'Revelar gabarito'}).click()
  await expect(page.getByText('RESPOSTA RESERVADA')).toBeVisible()
  await page.getByRole('button',{name:'Slide anterior'}).click()
  await expect(page.getByText('RESPOSTA RESERVADA')).toHaveCount(0)
  await expect(page.locator('.f4-pinned')).toHaveCount(1)
  await expect(page.locator('.f4-pinned')).toHaveAttribute('style',/left: 12%/)
})
test('modo responsivo não deixa controles fora da viewport',async({page})=>{
  const {dialog}=await open(page)
  const dimensions=await dialog.evaluate(element=>({
    clientWidth:element.clientWidth,
    scrollWidth:element.scrollWidth,
    clientHeight:element.clientHeight,
    scrollHeight:element.scrollHeight
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth+2)
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight+2)
  await expect(page.getByRole('button',{name:'Fechar apresentação'})).toBeInViewport()
  await expect(page.getByRole('button',{name:'Próximo slide'})).toBeInViewport()
})
