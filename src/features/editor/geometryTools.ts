import { normalizeRect } from './layoutModel.ts'
import type { BlockRect } from './layoutModel.ts'

export type Alignment='left'|'centerX'|'right'|'top'|'centerY'|'bottom'
export const GRID_STEP=.02
const bounded=(rect:BlockRect)=>normalizeRect(rect)??rect
const rounded=(value:number,step:number)=>Math.round(value/step)*step

/** Snap geometry to the canvas grid and meaningful slide guides. */
export function snapGeometry(rect:BlockRect,action:'move'|'resize',enabled=true):BlockRect{
  if(!enabled)return bounded(rect)
  if(action==='resize')return bounded({...rect,
    w:rounded(rect.w,GRID_STEP),h:rounded(rect.h,GRID_STEP)})
  let x=rounded(rect.x,GRID_STEP),y=rounded(rect.y,GRID_STEP)
  // Magnetic guides: visible-safe margins and horizontal/vertical center.
  const safe=.06
  if(Math.abs(rect.x-safe)<.014)x=safe
  if(Math.abs(rect.y-safe)<.014)y=safe
  if(Math.abs(rect.x+rect.w-(1-safe))<.014)x=1-safe-rect.w
  if(Math.abs(rect.y+rect.h-(1-safe))<.014)y=1-safe-rect.h
  if(Math.abs(rect.x+rect.w/2-.5)<.014)x=.5-rect.w/2
  if(Math.abs(rect.y+rect.h/2-.5)<.014)y=.5-rect.h/2
  return bounded({...rect,x,y})
}
export function alignGeometry(rect:BlockRect,alignment:Alignment):BlockRect {
  const margin=.06
  if(alignment==='left')return bounded({...rect,x:margin})
  if(alignment==='centerX')return bounded({...rect,x:(1-rect.w)/2})
  if(alignment==='right')return bounded({...rect,x:1-margin-rect.w})
  if(alignment==='top')return bounded({...rect,y:margin})
  if(alignment==='centerY')return bounded({...rect,y:(1-rect.h)/2})
  return bounded({...rect,y:1-margin-rect.h})
}
export function changeLayer(rect:BlockRect,direction:'forward'|'backward'):BlockRect {
  return bounded({...rect,z:Math.min(100,Math.max(0,rect.z+(direction==='forward'?1:-1)))})
}
export function fitImageGeometry(rect:BlockRect):BlockRect{
  return bounded({...rect,x:.12,y:.15,w:.76,h:.67})
}
export function percentToRect(rect:BlockRect,field:'x'|'y'|'w'|'h',percent:number):BlockRect{
  if(!Number.isFinite(percent))return rect
  return bounded({...rect,[field]:percent/100})
}
export function movingGuides(rect:BlockRect){
  return {
    vertical:Math.abs(rect.x+rect.w/2-.5)<.007,
    horizontal:Math.abs(rect.y+rect.h/2-.5)<.007
  }
}
