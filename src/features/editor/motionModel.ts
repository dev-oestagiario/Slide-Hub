export const ENTRANCES=['fade','rise','zoom','slide'] as const
export type Entrance=typeof ENTRANCES[number]
export type Transition='fade'|'slide'|'zoom'
export type ElementMotion={effect:Entrance;order:number;duration:number; delay?:number;exit?:Entrance;exitDuration?:number;exitDelay?:number;exitOrder?:number}
export type SlideTiming={hold:number;transitionDuration:number}
export type MotionLayout={elements:Record<string,ElementMotion>;transitions:Record<string,Transition>; timings?:Record<string,SlideTiming>}
type MotionBlock={id:string}
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{}
const number=(v:unknown,min:number,max:number,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,Math.round(v))):fallback
export function cleanMotion(raw:unknown,blocks:readonly MotionBlock[]):MotionLayout|undefined{
 const value=object(raw),elements:MotionLayout['elements']={},transitions:MotionLayout['transitions']={}
 const timings:Record<string,SlideTiming>={}
 const valid=new Set(blocks.map(b=>b.id))
 for(const [id,entry] of Object.entries(object(value.elements))){
   if(!valid.has(id))continue
   const r=object(entry)
   if(!(ENTRANCES as readonly unknown[]).includes(r.effect))continue
   elements[id]={effect:r.effect as Entrance,order:number(r.order,1,999,1),duration:number(r.duration,100,2000,350),
     ...(typeof r.delay==='number'&&Number.isFinite(r.delay)?{delay:number(r.delay,0,30000,0)}:{}),
     ...((ENTRANCES as readonly unknown[]).includes(r.exit)?{exit:r.exit as Entrance,exitDuration:number(r.exitDuration,100,2000,350),exitDelay:number(r.exitDelay,0,30000,0),exitOrder:number(r.exitOrder,1,999,1)}:{})}
 }
 for(const [id,entry] of Object.entries(object(value.transitions))){
   if(valid.has(id)&&(entry==='fade'||entry==='slide'||entry==='zoom'))transitions[id]=entry
 }
 for(const [id,entry] of Object.entries(object(value.timings))){
   if(!valid.has(id))continue
   const r=object(entry)
   timings[id]={hold:number(r.hold,500,120000,5000),transitionDuration:number(r.transitionDuration,100,2000,360)}
 }
 return Object.keys(elements).length||Object.keys(transitions).length||Object.keys(timings).length?{elements,transitions,...(Object.keys(timings).length?{timings}:{})}:undefined
}
export function copyMotion(raw:MotionLayout|undefined,from:string,to:string):MotionLayout|undefined{
 if(!raw)return undefined
 return {...raw,...(raw.timings?.[from]?{timings:{...raw.timings,[to]:raw.timings[from]}}:{}),elements:{...raw.elements,...(raw.elements[from]?{[to]:raw.elements[from]}:{})},transitions:{...raw.transitions,...(raw.transitions[from]?{[to]:raw.transitions[from]}:{})}}
}
export function revealOrder(blocks:readonly MotionBlock[],motion?:MotionLayout):string[]{
 return blocks.map((b,index)=>({id:b.id,index,config:motion?.elements[b.id]}))
   .filter(b=>b.config).sort((a,b)=>a.config!.order-b.config!.order||a.index-b.index).map(b=>b.id)
}
export function motionEqual(a:MotionLayout|undefined,b:MotionLayout|undefined){
 const sorted=(v:MotionLayout|undefined)=>JSON.stringify([Object.entries(v?.elements??{}).sort(([a],[b])=>a.localeCompare(b)),Object.entries(v?.transitions??{}).sort(([a],[b])=>a.localeCompare(b)),Object.entries(v?.timings??{}).sort(([a],[b])=>a.localeCompare(b))])
 return sorted(a)===sorted(b)
}

export type TimelineEvent={id:string;kind:'enter'|'exit';effect:Entrance;delay:number;duration:number}
export const DEFAULT_TIMING:SlideTiming={hold:5000,transitionDuration:360}
/** Entrances precede exits; timestamps are sequential and never overlap. */
export function timeline(blocks:readonly MotionBlock[],motion?:MotionLayout):TimelineEvent[]{
 const entries=revealOrder(blocks,motion)
 const exits=entries.filter(id=>motion?.elements[id]?.exit).sort((a,b)=>(motion!.elements[a].exitOrder??1)-(motion!.elements[b].exitOrder??1))
 return [...entries.map(id=>{const r=motion!.elements[id];return {id,kind:'enter' as const,effect:r.effect,duration:r.duration,delay:r.delay??0}}),
 ...exits.map(id=>{const r=motion!.elements[id];return {id,kind:'exit' as const,effect:r.exit!,duration:r.exitDuration??350,delay:r.exitDelay??0}})]
}
export function elementPhase(events:readonly TimelineEvent[],step:number,id:string):'waiting'|'entered'|'exited'|'static'{
 if(!events.some(e=>e.id===id))return 'static'
 let phase:'waiting'|'entered'|'exited'='waiting'
 for(const e of events.slice(0,Math.max(0,step)))if(e.id===id)phase=e.kind==='enter'?'entered':'exited'
 return phase
}
/** Delay until next step: wait for the last effect, then next event's delay.
 * Hold after the last reveal, BEFORE first exit, or after final reveal with no exits. */
export function nextDelay(events:readonly TimelineEvent[],step:number,timing:SlideTiming,transition:boolean):number{
 const previous=events[step-1],next=events[step]
 const base=previous?.duration??(transition?timing.transitionDuration:0)
 const hold=(!next&&previous?.kind!=='exit')||(next?.kind==='exit'&&previous?.kind!=='exit')?timing.hold:0
 return Math.max(100,base+hold+(next?.delay??0))
}
export function estimatedDuration(events:readonly TimelineEvent[],timing:SlideTiming,transition:boolean):number{
 return Array.from({length:events.length+1},(_,i)=>nextDelay(events,i,timing,transition)).reduce((sum,n)=>sum+n,0)
}
