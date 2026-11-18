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

export type ResizeHandle='n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw'
export const RESIZE_HANDLES:ReadonlyArray<{id:ResizeHandle;label:string}>=[
  {id:'nw',label:'Redimensionar canto superior esquerdo'},
  {id:'n',label:'Redimensionar borda superior'},
  {id:'ne',label:'Redimensionar canto superior direito'},
  {id:'e',label:'Redimensionar borda direita'},
  {id:'se',label:'Redimensionar canto inferior direito'},
  {id:'s',label:'Redimensionar borda inferior'},
  {id:'sw',label:'Redimensionar canto inferior esquerdo'},
  {id:'w',label:'Redimensionar borda esquerda'}
]
const limit=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v))

/** The opposite edge stays anchored, including at canvas boundaries. */
export function resizeGeometry(origin:BlockRect,handle:ResizeHandle,dx:number,dy:number,
  snap=false,proportional=false):BlockRect{
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return origin
  const horizontal=handle.includes('e')?1:handle.includes('w')?-1:0
  const vertical=handle.includes('s')?1:handle.includes('n')?-1:0
  const anchorX=horizontal<0?origin.x+origin.w:origin.x
  const anchorY=vertical<0?origin.y+origin.h:origin.y
  const maxW=horizontal<0?anchorX:1-anchorX
  const maxH=vertical<0?anchorY:1-anchorY
  const movingX=horizontal<0?origin.x:origin.x+origin.w
  const movingY=vertical<0?origin.y:origin.y+origin.h
  const deltaX=snap?rounded(movingX+dx,GRID_STEP)-movingX:dx
  const deltaY=snap?rounded(movingY+dy,GRID_STEP)-movingY:dy
  let w=horizontal?limit(origin.w+horizontal*deltaX,.08,maxW):origin.w
  let h=vertical?limit(origin.h+vertical*deltaY,.05,maxH):origin.h
  if(proportional&&horizontal&&vertical){
    const sx=(origin.w+horizontal*deltaX)/origin.w
    const sy=(origin.h+vertical*deltaY)/origin.h
    const intended=Math.abs(sx-1)>=Math.abs(sy-1)?sx:sy
    const scale=limit(intended,Math.max(.08/origin.w,.05/origin.h),
      Math.min(maxW/origin.w,maxH/origin.h))
    w=origin.w*scale;h=origin.h*scale
  }
  return bounded({...origin,x:horizontal<0?anchorX-w:origin.x,
    y:vertical<0?anchorY-h:origin.y,w,h})
}
