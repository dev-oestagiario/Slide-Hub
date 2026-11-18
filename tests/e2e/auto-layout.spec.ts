import { expect, test } from '@playwright/test'

test('imagem grande é contida e texto excedente gera páginas adicionais',async({page})=>{
  await page.goto('/tests/e2e/auto-layout.html')
  const slide=page.locator('.mini-slide')
  await expect(slide).toHaveCSS('aspect-ratio','16 / 9')
  await expect(page.getByText(/\d+ slides automáticos/)).toBeVisible()
  const count=Number((await page.locator('main header strong').innerText()).split(' ')[0])
  expect(count).toBeGreaterThan(1)
  const image=page.locator('.f7-autofit img')
  await expect(image).toBeVisible()
  const metrics=await page.evaluate(()=>{
    const stage=document.querySelector('.f7-autofit')!
    const image=document.querySelector('.f7-autofit img')!
    return {stage:stage.getBoundingClientRect().toJSON(),image:image.getBoundingClientRect().toJSON()}
  })
  expect(metrics.image.right).toBeLessThanOrEqual(metrics.stage.right+3)
  expect(metrics.image.bottom).toBeLessThanOrEqual(metrics.stage.bottom+3)
})

test('editor de precisão seleciona, desloca e ajusta o bloco sem alterar Markdown',async({page})=>{
  await page.goto('/tests/e2e/auto-layout.html')
  const source=await page.getByRole('textbox',{name:'Texto da aula'}).inputValue()
  await page.getByRole('button',{name:'Organizar visualmente'}).click()
  const heading=page.getByRole('button',{name:'Selecionar e mover Título'}).first()
  await heading.click()
  await expect(page.getByRole('region',{name:'Propriedades do elemento selecionado'})).toBeVisible()
  await page.getByRole('button',{name:'Centralizar horizontalmente'}).click()
  const moved=page.locator('.f7-editor-block.f7-selected')
  await expect(moved).toHaveAttribute('style',/left:/)
  await page.getByRole('spinbutton',{name:'Largura'}).fill('65')
  await expect(moved).toHaveAttribute('style',/width: 65%/)
  expect(await page.getByRole('textbox',{name:'Texto da aula'}).inputValue()).toBe(source)
})

test('layout permanece dentro da largura do celular e comandos estão acessíveis',async({page})=>{
  await page.goto('/tests/e2e/auto-layout.html')
  const width=await page.evaluate(()=>({window:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth}))
  expect(width.scroll).toBeLessThanOrEqual(width.window+2)
  await page.getByRole('button',{name:'Organizar visualmente'}).click()
  const block=page.getByRole('button',{name:'Selecionar e mover Título'}).first()
  await block.click()
  await expect(page.getByRole('spinbutton',{name:'Posição X'})).toBeVisible()
})


test('caixa de seleção acompanha a largura do título e não a do slide',async({page})=>{
  await page.goto('/tests/e2e/auto-layout.html')
  await page.getByRole('textbox',{name:'Texto da aula'}).fill('# Curto\n\nTexto curto.')
  await page.getByRole('button',{name:'Organizar visualmente'}).click()
  const title=page.getByRole('button',{name:'Selecionar e mover Título'}).first()
  await expect(title).toBeVisible()
  const sizes=await page.evaluate(()=>{
    const canvas=document.querySelector<HTMLElement>('.f7-canvas')!
    const block=canvas.querySelector<HTMLElement>('.f7-editor-block')!
    const heading=block.querySelector<HTMLElement>('h1')!
    return {
      canvas:canvas.getBoundingClientRect().width,
      block:block.getBoundingClientRect().width,
      text:heading.getBoundingClientRect().width
    }
  })
  expect(sizes.block).toBeLessThan(sizes.canvas*.9)
  expect(Math.abs(sizes.block-sizes.text)).toBeLessThan(32)
  await title.click()
  await expect(title).toHaveClass(/f7-selected/)
  const pct=Number(await page.getByRole('spinbutton',{name:'Largura'}).inputValue())
  expect(pct).toBeLessThan(90)
})

test('bloco já redimensionado mantém a largura personalizada ao selecioná-lo',async({page})=>{
  await page.goto('/tests/e2e/auto-layout.html')
  await page.getByRole('textbox',{name:'Texto da aula'}).fill('# Título pequeno\n\nAlguma explicação.')
  await page.getByRole('button',{name:'Organizar visualmente'}).click()
  const title=page.getByRole('button',{name:'Selecionar e mover Título'}).first()
  await title.click()
  await page.getByRole('spinbutton',{name:'Largura'}).fill('28')
  await expect(title).toHaveAttribute('style',/width: 28%/)
  await page.getByRole('button',{name:'Desmarcar elemento'}).click()
  await title.click()
  await expect(page.getByRole('spinbutton',{name:'Largura'})).toHaveValue('28')
})


test('F8: oito alças acompanham a seleção e não alteram o elemento até um ajuste',async({page})=>{
  await page.goto('/tests/e2e/auto-layout.html')
  await page.getByRole('textbox',{name:'Texto da aula'}).fill('# Curto\n\nTexto curto.')
  await page.getByRole('button',{name:'Organizar visualmente'}).click()
  const title=page.getByRole('button',{name:'Selecionar e mover Título'}).first()
  await title.click()
  const frame=page.locator('.f8-selection-frame')
  await expect(frame.locator('.f8-handle')).toHaveCount(8)
  const b=await title.boundingBox()
  const f=await frame.boundingBox()
  expect(b&&f).toBeTruthy()
  expect(Math.abs(b!.width-f!.width)).toBeLessThan(5)
  expect(Math.abs(b!.x-f!.x)).toBeLessThan(5)
  await expect(title).not.toHaveClass(/f4-pinned/)
  await page.getByRole('spinbutton',{name:'Posição X'}).fill('20')
  await page.getByRole('spinbutton',{name:'Posição Y'}).fill('20')
  await page.getByRole('spinbutton',{name:'Largura'}).fill('40')
  await page.getByRole('spinbutton',{name:'Altura'}).fill('30')
  const west=page.getByRole('button',{name:'Redimensionar borda esquerda'})
  await west.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('spinbutton',{name:'Posição X'})).toHaveValue('19')
  await expect(page.getByRole('spinbutton',{name:'Largura'})).toHaveValue('41')
  await page.keyboard.press('Escape')
  await expect(frame).toHaveCount(0)
  await expect(title).toHaveAttribute('style',/width: 41/)
})

test('F8: arrastar a alça direita altera somente largura sem deslocar o bloco',async({page})=>{
  await page.goto('/tests/e2e/auto-layout.html')
  await page.getByRole('textbox',{name:'Texto da aula'}).fill('# Curto\n\nTexto curto.')
  await page.getByRole('button',{name:'Organizar visualmente'}).click()
  await page.getByRole('button',{name:'Selecionar e mover Título'}).first().click()
  for(const [name,value] of [['Posição X','20'],['Posição Y','20'],['Largura','40'],['Altura','30']]){
    await page.getByRole('spinbutton',{name,exact:true}).fill(value)
  }
  const handle=page.getByRole('button',{name:'Redimensionar borda direita'})
  const box=await handle.boundingBox()
  const canvas=await page.locator('.f7-canvas').boundingBox()
  expect(box&&canvas).toBeTruthy()
  const x=box!.x+box!.width/2,y=box!.y+box!.height/2
  await page.mouse.move(x,y)
  await page.mouse.down()
  await page.mouse.move(x+canvas!.width*.10,y,{steps:5})
  await page.mouse.up()
  await expect(page.getByRole('spinbutton',{name:'Posição X'})).toHaveValue('20')
  await expect(page.getByRole('spinbutton',{name:'Altura'})).toHaveValue('30')
  await expect(page.getByRole('spinbutton',{name:'Largura'})).toHaveValue('50')
})
