import { normalizeRect } from './layoutModel.ts'
import type { BlockRect, EditorLayout } from './layoutModel.ts'
export type RectSet=Record<string,BlockRect>
export type MultiAction='left'|'centerX'|'right'|'top'|'centerY'|'bottom'|'distributeX'|'distributeY'|'group'|'ungroup'|'lock'|'unlock'|'rotateLeft'|'rotateRight'

export function setBlockRects(layout:EditorLayout,updates:RectSet):EditorLayout{
  const ids=new Set(layout.blocks.map(b=>b.id))
  const overrides={...layout.overrides}
  for(const [id,rect] of Object.entries(updates)){
    if(!ids.has(id))continue
    const next=normalizeRect(rect)
    if(next)overrides[id]=next
  }
  return {...layout,overrides}
}
export function bounds(rects:RectSet){
  const items=Object.values(rects)
  if(!items.length)return null
  const x=Math.min(...items.map(r=>r.x)),y=Math.min(...items.map(r=>r.y))
  return {x,y,w:Math.max(...items.map(r=>r.x+r.w))-x,
    h:Math.max(...items.map(r=>r.y+r.h))-y}
}
export function moveSelection(rects:RectSet,dx:number,dy:number):RectSet{
  if(Object.values(rects).some(r=>r.locked)||!Number.isFinite(dx)||!Number.isFinite(dy))return {}
  const b=bounds(rects)
  if(!b)return {}
  const x=Math.max(-b.x,Math.min(1-b.x-b.w,dx)),y=Math.max(-b.y,Math.min(1-b.y-b.h,dy))
  return Object.fromEntries(Object.entries(rects).map(([id,r])=>[id,{...r,x:r.x+x,y:r.y+y}]))
}
export function applyMultiAction(rects:RectSet,action:MultiAction,groupId?:string):RectSet{
  const entries=Object.entries(rects)
  const b=bounds(rects)
  if(!b)return {}
  const changes:RectSet={}
  if(action==='lock'||action==='unlock'){
    for(const [id,r] of entries){const {locked,...rest}=r;changes[id]=action==='lock'?{...r,locked:true}:rest}
    return changes
  }
  if(entries.some(([,r])=>r.locked))return {}
  if(action==='group'){
    if(entries.length<2||!groupId)return {}
    return Object.fromEntries(entries.map(([id,r])=>[id,{...r,group:groupId}]))
  }
  if(action==='ungroup')return Object.fromEntries(entries.map(([id,r])=>{const {group,...rest}=r;return [id,rest]}))
  if(action==='rotateLeft'||action==='rotateRight'){
    if(entries.length!==1)return {}
    const [id,r]=entries[0]
    return {[id]:normalizeRect({...r,rotation:(r.rotation??0)+(action==='rotateLeft'?-15:15)})!}
  }
  if(entries.length<2)return {}
  if(action==='distributeX'||action==='distributeY'){
    if(entries.length<3)return {}
    const horizontal=action==='distributeX',pos=horizontal?'x':'y',size=horizontal?'w':'h'
    const sorted=[...entries].sort((a,b)=>a[1][pos]-b[1][pos])
    const available=(horizontal?b.w:b.h)-sorted.reduce((sum,[,r])=>sum+r[size],0)
    if(available<0)return {}
    const gap=available/(sorted.length-1)
    let cursor=b[pos]
    for(const [id,r] of sorted){changes[id]={...r,[pos]:cursor};cursor+=r[size]+gap}
    return changes
  }
  for(const [id,r] of entries){
    const next={...r}
    if(action==='left')next.x=b.x
    if(action==='centerX')next.x=b.x+(b.w-r.w)/2
    if(action==='right')next.x=b.x+b.w-r.w
    if(action==='top')next.y=b.y
    if(action==='centerY')next.y=b.y+(b.h-r.h)/2
    if(action==='bottom')next.y=b.y+b.h-r.h
    changes[id]=next
  }
  return changes
}
