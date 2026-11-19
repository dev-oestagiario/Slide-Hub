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
export const ELEMENT_APPEARANCE_CSS=`
.f11-styled{box-sizing:border-box}
.f11-styled h1,.f11-styled h2,.f11-styled h3,.f11-styled h4,.f11-styled p,.f11-styled li,.f11-styled blockquote,.f11-styled td,.f11-styled th,.f11-styled strong,.f11-styled em,.f11-styled a{
  color:var(--f11-ink,inherit)!important;font-family:var(--f11-font,inherit)
}
.f11-styled h1{font-size:calc(2em * var(--f11-size,1))!important;line-height:1.2}
.f11-styled h2{font-size:calc(1.6em * var(--f11-size,1))!important;line-height:1.25}
.f11-styled h3{font-size:calc(1.3em * var(--f11-size,1))!important;line-height:1.3}
.f11-styled p,.f11-styled ul,.f11-styled ol,.f11-styled blockquote,.f11-styled table,.f11-styled pre{font-size:calc(1em * var(--f11-size,1))!important}
.f11-styled li{font-size:1em!important}
.f11-styled.f11-image{padding:0!important;overflow:hidden!important}
.f11-styled.f11-image p{width:100%;height:100%;margin:0!important}
.f11-styled.f11-image img{display:block;width:100%!important;height:100%!important;max-height:none!important;max-width:100%!important;object-fit:var(--f11-image-fit,contain);object-position:var(--f11-image-position,50% 50%);margin:0!important}
`
