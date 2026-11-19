import {useState} from 'react'
import {Play,Pause,RotateCcw,ChevronRight,Film,ChevronUp,ChevronDown} from 'lucide-react'
import {ENTRANCES,timeline,estimatedDuration,nextDelay,DEFAULT_TIMING} from './motionModel'
import type {Entrance,MotionLayout,Transition,ElementMotion} from './motionModel'
import {usePlaybackTimer} from './usePlaybackTimer'
import type {EditorSlide,SlideBlock} from './layoutModel'
const names:Record<Entrance,string>={fade:'Dissolver',rise:'Subir',slide:'Deslizar',zoom:'Zoom'}
const transitions:Record<Transition,string>={fade:'Dissolver',slide:'Deslizar',zoom:'Zoom'}
export function MotionPanel({slide,motion,block,locked,onChange,onPreview,onAdvance,onStop,step}:{slide:EditorSlide;motion?:MotionLayout;block?:SlideBlock;locked:boolean;onChange:(next:MotionLayout)=>void;onPreview:()=>void;onAdvance:()=>void;onStop:()=>void;step?:number}){
 const [open,setOpen]=useState(false)
 const [auto,setAuto]=useState(false)
 const current=motion??{elements:{},transitions:{}}
 const config=block?current.elements[block.id]:undefined
 const events=timeline(slide.blocks,motion)
 const timing=current.timings?.[slide.key]??DEFAULT_TIMING
 const transition=Boolean(current.transitions[slide.key])
 const total=estimatedDuration(events,timing,transition)
 usePlaybackTimer(auto&&step!==undefined&&step<events.length,nextDelay(events,step??0,timing,transition),slide.key+':'+step,onAdvance)
 const update=(value:MotionLayout)=>{setAuto(false);onChange(value)}
 const updateTiming=(part:Partial<typeof timing>)=>update({...current,timings:{...current.timings,[slide.key]:{...timing,...part}}})
 const element=(effect:Entrance|'',params?:Partial<ElementMotion>)=>{
   if(!block||locked)return
   const next={...current.elements}
   if(effect)next[block.id]={...config,...params,effect,order:params?.order??config?.order??Math.min(999,Math.max(0,...slide.blocks.map(b=>next[b.id]?.order??0))+1),duration:params?.duration??config?.duration??350}
   else delete next[block.id]
   update({...current,elements:next})
 }
 const move=(id:string,index:number,direction:number,kind:'enter'|'exit')=>{
   const list=events.filter(e=>e.kind===kind).map(e=>e.id),target=index+direction
   if(target<0||target>=list.length)return
   const next={...current.elements};[list[index],list[target]]=[list[target],list[index]]
   list.forEach((key,i)=>{next[key]={...next[key],[kind==='enter'?'order':'exitOrder']:i+1}})
   update({...current,elements:next})
 }
 return <section className="f13-motion-panel" aria-label="Animações e transições">
  <button type="button" className="f13-motion-toggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Film size={16}/> Animações e transições <small>{events.length} efeitos</small></button>
  {open&&<div className="f13-motion-fields">
   <label>Transição do slide<select aria-label="Transição do slide" disabled={!slide.blocks.length} value={current.transitions[slide.key]??''}
    onChange={e=>{const next={...current.transitions};if(e.target.value)next[slide.key]=e.target.value as Transition;else delete next[slide.key];update({...current,transitions:next})}}>
    <option value="">Nenhuma</option>{Object.entries(transitions).map(([v,n])=><option key={v} value={v}>{n}</option>)}
   </select></label>
   <div className="f13-motion-numbers"><label>Permanência do slide (ms)<input aria-label="Permanência do slide" type="number" min={500} max={120000} step={500} disabled={!slide.blocks.length} value={timing.hold} onChange={e=>updateTiming({hold:Number(e.target.value)})}/></label><label>Duração da transição (ms)<input aria-label="Duração da transição" type="number" min={100} max={2000} step={50} disabled={!slide.blocks.length} value={timing.transitionDuration} onChange={e=>updateTiming({transitionDuration:Number(e.target.value)})}/></label></div>
   {block&&!locked?<><label>Animação do elemento<select aria-label="Animação do elemento" value={config?.effect??''} onChange={e=>element(e.target.value as Entrance|'')}>
     <option value="">Nenhuma</option>{ENTRANCES.map(v=><option key={v} value={v}>{names[v]}</option>)}
   </select></label>
   {config&&<div className="f13-motion-numbers">
     <label>Ordem de entrada<input type="number" aria-label="Ordem de entrada" min={1} max={999} value={config.order} onChange={e=>element(config.effect,{order:Number(e.target.value)})}/></label>
     <label>Duração (ms)<input type="number" aria-label="Duração da animação" min={100} max={2000} step={50} value={config.duration} onChange={e=>element(config.effect,{duration:Number(e.target.value)})}/></label>
   </div>}</>:<small>Selecione um elemento desbloqueado para configurar sua entrada.</small>}
   {block&&config&&!locked&&<>
    <label>Espera antes da entrada (ms)<input type="number" aria-label="Espera antes da entrada" min={0} max={30000} step={100} value={config.delay??0} onChange={e=>element(config.effect,{delay:Number(e.target.value)})}/></label>
    <label>Animação de saída<select aria-label="Animação de saída" value={config.exit??''} onChange={e=>element(config.effect,{exit:(e.target.value||undefined) as Entrance|undefined})}><option value="">Nenhuma</option>{ENTRANCES.map(v=><option key={v} value={v}>{names[v]}</option>)}</select></label>
    {config.exit&&<div className="f13-motion-numbers"><label>Duração da saída (ms)<input aria-label="Duração da saída" type="number" min={100} max={2000} step={50} value={config.exitDuration??350} onChange={e=>element(config.effect,{exitDuration:Number(e.target.value)})}/></label><label>Espera antes da saída (ms)<input aria-label="Espera antes da saída" type="number" min={0} max={30000} step={100} value={config.exitDelay??0} onChange={e=>element(config.effect,{exitDelay:Number(e.target.value)})}/></label></div>}
   </>}
   <div className="f14-timeline" aria-label="Linha do tempo das animações">
    <header><strong>Linha do tempo</strong><small>{(total/1000).toFixed(1)} s estimados</small></header>
    {events.length===0&&<small>Adicione animações para organizar a sequência.</small>}
    {events.map((event,index)=>{
      const group=events.filter(e=>e.kind===event.kind),position=group.findIndex(e=>e.id===event.id)
      const start=events.slice(0,index+1).reduce((sum,_,i)=>sum+nextDelay(events,i,timing,transition),0)
      return <div key={event.kind+event.id} className="f14-timeline-row">
        <span>{event.kind==='enter'?'Entrada':'Saída'} · {slide.blocks.find(b=>b.id===event.id)?.markdown.replace(/^#+\s*/,'').slice(0,40)}</span>
        <div className="f14-time-track"><span className={event.kind} style={{left:(start/total*100)+'%',width:(event.duration/total*100)+'%'}}/></div>
        <small>{(start/1000).toFixed(1)} s · {event.duration} ms</small>
        <button type="button" aria-label={'Antecipar '+event.kind+' '+event.id} disabled={position===0} onClick={()=>move(event.id,position,-1,event.kind)}><ChevronUp size={14}/></button>
        <button type="button" aria-label={'Adiar '+event.kind+' '+event.id} disabled={position===group.length-1} onClick={()=>move(event.id,position,1,event.kind)}><ChevronDown size={14}/></button>
      </div>
    })}
   </div>
   <div className="f13-motion-actions"><button type="button" onClick={()=>{setAuto(false);onPreview()}}><Play size={14}/> {step===undefined?'Prévia dos efeitos':'Reiniciar prévia'}</button>
    {step!==undefined&&<><button type="button" disabled={step>=events.length} onClick={()=>{setAuto(false);onAdvance()}}><ChevronRight size={14}/> Próxima entrada</button>
     <button type="button" disabled={step>=events.length} onClick={()=>setAuto(v=>!v)}>{auto?<Pause size={14}/>:<Play size={14}/>} {auto?'Pausar prévia':'Reproduzir prévia'}</button>
     <button type="button" onClick={()=>{setAuto(false);onStop()}}><RotateCcw size={14}/> Encerrar prévia</button><small>Etapa {step}/{events.length}</small></>}
   </div>
  </div>}
 </section>
}
