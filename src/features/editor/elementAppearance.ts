import type { CSSProperties } from 'react'
import { cleanElementStyle } from './layoutModel'
import type { BlockRect } from './layoutModel'
export function elementAppearance(rect?:BlockRect|null):CSSProperties{
  const s=cleanElementStyle(rect?.style)
  if(!s)return {}
  return {
    '--f11-font':s.font?({system:'system-ui, sans-serif',serif:'Georgia, serif',mono:'ui-monospace, monospace'}[s.font]):undefined,
    '--f11-size':s.size?String(s.size/100):undefined,
    '--f11-ink':s.color,
    '--f11-image-fit':s.imageFit,
    '--f11-image-position':s.imageFit==='cover'?((s.imageX??50)+'% '+(s.imageY??50)+'%'):undefined,
    backgroundColor:s.background,
    border:s.borderWidth?(`${s.borderWidth}px solid ${s.borderColor??'#64748b'}`):undefined,
    borderRadius:s.radius!==undefined?s.radius+'px':undefined,
    opacity:s.opacity!==undefined?s.opacity/100:undefined
  } as CSSProperties
}
export function appearanceClasses(rect?:BlockRect|null,kind?:string):string{
  const s=cleanElementStyle(rect?.style)
  if(!s)return ''
  return ['f11-styled',s.color?'f11-ink':'',s.font?'f11-font':'',s.size?'f11-size':'',kind==='image'?'f11-image':''].filter(Boolean).join(' ')
}
export const ELEMENT_APPEARANCE_CSS="\n.f11-styled{box-sizing:border-box}\n.f11-ink :is(h1,h2,h3,h4,h5,h6,p,li,blockquote,td,th,strong,em,a){color:var(--f11-ink)!important}\n.f11-font :is(h1,h2,h3,h4,h5,h6,p,li,blockquote,td,th,strong,em,a){font-family:var(--f11-font)!important}\n.f11-size h1{font-size:calc(2em * var(--f11-size))!important;line-height:1.2}\n.f11-size h2{font-size:calc(1.6em * var(--f11-size))!important;line-height:1.25}\n.f11-size h3{font-size:calc(1.3em * var(--f11-size))!important;line-height:1.3}\n.f11-size :is(p,ul,ol,blockquote,table,pre){font-size:calc(1em * var(--f11-size))!important}\n.f11-size li{font-size:1em!important}\n.f11-styled.f11-image{padding:0!important;overflow:hidden!important}\n.f11-styled.f11-image p{width:100%;height:100%;margin:0!important}\n.f11-styled.f11-image img{display:block;width:100%!important;height:100%!important;max-height:none!important;max-width:100%!important;object-fit:var(--f11-image-fit,contain);object-position:var(--f11-image-position,50% 50%);margin:0!important}\n"
