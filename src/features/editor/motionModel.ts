export const ENTRANCES=['fade','rise','zoom','slide'] as const
export type Entrance=typeof ENTRANCES[number]
export type Transition='fade'|'slide'|'zoom'
export type ElementMotion={effect:Entrance;order:number;duration:number}
export type MotionLayout={elements:Record<string,ElementMotion>;transitions:Record<string,Transition>}
type MotionBlock={id:string}
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{}
const number=(v:unknown,min:number,max:number,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,Math.round(v))):fallback
export function cleanMotion(raw:unknown,blocks:readonly MotionBlock[]):MotionLayout|undefined{
 const value=object(raw),elements:MotionLayout['elements']={},transitions:MotionLayout['transitions']={}
 const valid=new Set(blocks.map(b=>b.id))
 for(const [id,entry] of Object.entries(object(value.elements))){
   if(!valid.has(id))continue
   const r=object(entry)
   if(!(ENTRANCES as readonly unknown[]).includes(r.effect))continue
   elements[id]={effect:r.effect as Entrance,order:number(r.order,1,999,1),duration:number(r.duration,100,2000,350)}
 }
 for(const [id,entry] of Object.entries(object(value.transitions))){
   if(valid.has(id)&&(entry==='fade'||entry==='slide'||entry==='zoom'))transitions[id]=entry
 }
 return Object.keys(elements).length||Object.keys(transitions).length?{elements,transitions}:undefined
}
export function copyMotion(raw:MotionLayout|undefined,from:string,to:string):MotionLayout|undefined{
 if(!raw)return undefined
 return {elements:{...raw.elements,...(raw.elements[from]?{[to]:raw.elements[from]}:{})},transitions:{...raw.transitions,...(raw.transitions[from]?{[to]:raw.transitions[from]}:{})}}
}
export function revealOrder(blocks:readonly MotionBlock[],motion?:MotionLayout):string[]{
 return blocks.map((b,index)=>({id:b.id,index,config:motion?.elements[b.id]}))
   .filter(b=>b.config).sort((a,b)=>a.config!.order-b.config!.order||a.index-b.index).map(b=>b.id)
}
export function motionEqual(a:MotionLayout|undefined,b:MotionLayout|undefined){
 const sorted=(v:MotionLayout|undefined)=>JSON.stringify([Object.entries(v?.elements??{}).sort(([a],[b])=>a.localeCompare(b)),Object.entries(v?.transitions??{}).sort(([a],[b])=>a.localeCompare(b))])
 return sorted(a)===sorted(b)
}
