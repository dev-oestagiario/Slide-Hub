import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SLIDE_THEME, normalizeSlideTheme, slideBackgroundStyle, themeForSlide, contrastRatio } from '../src/lib/slideThemes.ts'

test('reconhece configuração antiga com três cores', () => {
  const theme = normalizeSlideTheme({ background:'#12544F',foreground:'#FFFFFF',accent:'#7FE0D4' })
  assert.equal(theme.background, '#12544F')
  assert.equal(theme.backgroundMode, 'solid')
  assert.equal(theme.overlayOpacity, .48)
})

test('bloqueia URL e CSS não confiáveis em fundos', () => {
  const t=normalizeSlideTheme({background:'red";background:url(bad)',backgroundImage:'javascript:alert(1)',backgroundMode:'image'})
  assert.equal(t.background,DEFAULT_SLIDE_THEME.background)
  assert.equal(t.backgroundImage,undefined)
  assert.equal(t.backgroundMode,'solid')
})

test('imagem com camada de leitura aplicada a todos os slides', () => {
  const t=normalizeSlideTheme({
    ...DEFAULT_SLIDE_THEME,backgroundImage:'https://kbezscxuhqculdvraqun.supabase.co/storage/v1/object/public/slide-theme-backgrounds/u/img.webp',
    backgroundMode:'image',foreground:'#FFFFFF',overlayOpacity:.63
  })
  assert.equal(themeForSlide(t,'dark').backgroundImage,t.backgroundImage)
  const bg=String(slideBackgroundStyle(t).backgroundImage)
  assert.ok(bg.includes('linear-gradient'))
  assert.ok(bg.includes('img.webp'))
  assert.ok(bg.includes('0.63'))
})

test('temas uniformes ignoram alteração antiga por página', () => {
  const t=normalizeSlideTheme({ ...DEFAULT_SLIDE_THEME,background:'#F5EFE1',backgroundMode:'solid' })
  assert.deepEqual(themeForSlide(t,'dark'),t)
  assert.deepEqual(themeForSlide(t,'light'),t)
})

test('degradê e contraste',()=>{
  const t=normalizeSlideTheme({...DEFAULT_SLIDE_THEME,backgroundMode:'gradient'})
  assert.ok(String(slideBackgroundStyle(t).backgroundImage).includes('linear-gradient'))
  assert.ok(contrastRatio('#FFFFFF','#000000')>=21)
  assert.ok(contrastRatio('#FFFFFF','#FAFCFB')<1.1)
})
