import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('F6: exporting all slides excludes private answers and note content',async({page})=>{
  await page.goto('/tests/e2e/presenter.html')
  await page.getByRole('button',{name:'Exportar apresentação'}).click()
  const dialog=page.getByRole('dialog',{name:'Exportar apresentação: Aula de teste'})
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.f6-page')).toHaveCount(3)
  await expect(dialog.getByText('RESPOSTA RESERVADA')).toHaveCount(0)
  await expect(dialog.getByText('ANOTAÇÃO SOMENTE PROFESSOR')).toHaveCount(0)
  await expect(dialog.locator('.f6-manual-block')).toHaveAttribute('style',/left: 12%/)
  const downloadWait=page.waitForEvent('download')
  await dialog.getByRole('button',{name:'Baixar HTML'}).click()
  const download=await downloadWait
  expect(download.suggestedFilename()).toBe('aula-de-teste.html')
  const html=await readFile(await download.path(),'utf8')
  expect(html).toContain('Conceitos principais')
  expect(html).toContain('f6-manual-block')
  expect(html).toContain('Content-Security-Policy')
  expect(html).not.toContain('RESPOSTA RESERVADA')
  expect(html).not.toContain('ANOTAÇÃO SOMENTE PROFESSOR')
  expect(html).not.toMatch(/<script\b/i)
})

test('F6: export can invoke browser printing without a backend',async({page})=>{
  await page.addInitScript(()=>{
    (window as Window & {__f6Printed?:boolean}).__f6Printed=false
    window.print=()=>{(window as Window & {__f6Printed?:boolean}).__f6Printed=true}
  })
  await page.goto('/tests/e2e/presenter.html')
  await page.getByRole('button',{name:'Exportar apresentação'}).click()
  await page.getByRole('button',{name:'Imprimir / PDF'}).click()
  await expect.poll(()=>page.evaluate(()=>(window as Window&{__f6Printed?:boolean}).__f6Printed)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog',{name:'Exportar apresentação: Aula de teste'})).not.toBeVisible()
})

test('F6: student has no access to private export controls',async({page})=>{
  await page.goto('/tests/e2e/presenter.html?student=1')
  await expect(page.getByRole('button',{name:'Exportar apresentação'})).toHaveCount(0)
})
