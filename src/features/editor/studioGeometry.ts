import { bounds, moveSelection } from './multiGeometry.ts'
import type { RectSet } from './multiGeometry.ts'
import { normalizeRect } from './layoutModel.ts'
import type { BlockRect } from './layoutModel.ts'
import type { ResizeHandle } from './geometryTools.ts'
export type Guide={axis:'x'|'y';value:number}
export type Corner=Extract<ResizeHandle,'nw'|'ne'|'sw'|'se'>
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n))

/** Uniform group scaling keeps all relative positions and the opposite corner fixed. */
export function resizeGroup(rects:RectSet,corner:Corner,dx:number,dy:number):RectSet{
  const items=Object.values(rects),b=bounds(rects)
  if(!b||items.length<2||items.some(r=>r.locked||r.rotation)||!Number.isFinite(dx)||!Number.isFinite(dy))return {}
  const west=corner.includes('w'),north=corner.includes('n')
  const ax=west?b.x+b.w:b.x,ay=north?b.y+b.h:b.y
  const sx=1+(west?-dx:dx)/b.w,sy=1+(north?-dy:dy)/b.h
  const requested=Math.abs(sx-1)>=Math.abs(sy-1)?sx:sy
  const minimum=Math.max(...items.map(r=>Math.max(.08/r.w,.05/r.h)))
  const maximum=Math.min((west?ax:1-ax)/b.w,(north?ay:1-ay)/b.h)
  const scale=clamp(requested,minimum,Math.max(minimum,maximum))
  return Object.fromEntries(Object.entries(rects).map(([id,r])=>[id,{
    ...r,x:ax+(r.x-ax)*scale,y:ay+(r.y-ay)*scale,w:r.w*scale,h:r.h*scale
  }]))
}
export function angleAt(x:number,y:number,cx:number,cy:number):number{
  return Math.atan2(y-cy,x-cx)*180/Math.PI
}
export function rotateBy(rect:BlockRect,delta:number,snap=false):BlockRect{
  if(rect.locked||!Number.isFinite(delta))return rect
  const angle=(rect.rotation??0)+delta
  return normalizeRect({...rect,rotation:snap?Math.round(angle/15)*15:Math.round(angle)})??rect
}
const lines=(r:{x:number;y:number;w:number;h:number},axis:'x'|'y')=>
  axis==='x'?[r.x,r.x+r.w/2,r.x+r.w]:[r.y,r.y+r.h/2,r.y+r.h]
/** Snap the selection's edges/center to the nearest visible peer edge/center. */
export function smartMove(rects:RectSet,peers:RectSet,dx:number,dy:number,toleranceX=.012,toleranceY=.012){
  const b=bounds(rects)
  if(!b||Object.values(rects).some(r=>r.locked))return {updates:{} as RectSet,guides:[] as Guide[]}
  const guides:Guide[]=[]
  function offset(axis:'x'|'y',delta:number,tolerance:number){
    let best=Infinity,adjust=0,target=0
    for(const peer of Object.values(peers)){
      if(peer.rotation)continue
      for(const source of lines(b!,axis))for(const line of lines(peer,axis)){
        const diff=line-source-delta
        if(Math.abs(diff)<=tolerance&&Math.abs(diff)<best){best=Math.abs(diff);adjust=diff;target=line}
      }
    }
    if(Number.isFinite(best))guides.push({axis,value:target})
    return delta+adjust
  }
  const updates=moveSelection(rects,offset('x',dx,toleranceX),offset('y',dy,toleranceY))
  const final=bounds(updates)
  return {updates,guides:guides.filter(g=>final&&lines(final,g.axis).some(n=>Math.abs(n-g.value)<.0001))}
}
