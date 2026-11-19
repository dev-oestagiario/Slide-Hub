import {useState} from 'react'
import {Play,RotateCcw,ChevronRight,Film} from 'lucide-react'
import {ENTRANCES,revealOrder} from './motionModel'
import type {Entrance,MotionLayout,Transition} from './motionModel'
import type {EditorSlide,SlideBlock} from './layoutModel'
const names:Record<Entrance,string>={fade:'Dissolver',rise:'Subir',slide:'Deslizar',zoom:'Zoom'}
const transitions:Record<Transition,string>={fade:'Dissolver',slide:'Deslizar',zoom:'Zoom'}
export function MotionPanel({slide,motion,block,locked,onChange,onPreview,onAdvance,onStop,step}:{slide:EditorSlide;motion?:MotionLayout;block?:SlideBlock;locked:boolean;onChange:(next:MotionLayout)=>void;onPreview:()=>void;onAdvance:()=>void;onStop:()=>void;step?:number}){
 const [open,setOpen]=useState(false)
 const current=motion??{elements:{},transitions:{}}
 const order=revealOrder(slide.blocks,motion)
 const config=block?current.elements[block.id]:undefined
 const update=(value:MotionLayout)=>onChange(value)
 const element=(effect:Entrance|'',params?:{order?:number;duration?:number})=>{
   if(!block||locked)return
   const next={...current.elements}
   if(effect)next[block.id]={effect,order:params?.order??config?.order??Math.max(0,...Object.values(next).map(x=>x.order))+1,duration:params?.duration??config?.duration??350}
   else delete next[block.id]
   update({...current,elements:next})
 }
 return <section className="f13-motion-panel" aria-label="Animações e transições">
  <button type="button" className="f13-motion-toggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Film size={16}/> Animações e transições <small>{order.length} efeitos</small></button>
  {open&&<div className="f13-motion-fields">
   <label>Transição do slide<select aria-label="Transição do slide" disabled={!slide.blocks.length} value={current.transitions[slide.key]??''}
    onChange={e=>{const next={...current.transitions};if(e.target.value)next[slide.key]=e.target.value as Transition;else delete next[slide.key];update({...current,transitions:next})}}>
    <option value="">Nenhuma</option>{Object.entries(transitions).map(([v,n])=><option key={v} value={v}>{n}</option>)}
   </select></label>
   {block&&!locked?<><label>Animação do elemento<select aria-label="Animação do elemento" value={config?.effect??''} onChange={e=>element(e.target.value as Entrance|'')}>
     <option value="">Nenhuma</option>{ENTRANCES.map(v=><option key={v} value={v}>{names[v]}</option>)}
   </select></label>
   {config&&<div className="f13-motion-numbers">
     <label>Ordem de entrada<input type="number" aria-label="Ordem de entrada" min={1} max={999} value={config.order} onChange={e=>element(config.effect,{order:Number(e.target.value)})}/></label>
     <label>Duração (ms)<input type="number" aria-label="Duração da animação" min={100} max={2000} step={50} value={config.duration} onChange={e=>element(config.effect,{duration:Number(e.target.value)})}/></label>
   </div>}</>:<small>Selecione um elemento desbloqueado para configurar sua entrada.</small>}
   {order.length>0&&<ol className="f13-sequence">{order.map((id,i)=><li key={id}>{i+1}. {slide.blocks.find(b=>b.id===id)?.markdown.replace(/^#+\s*/,'').slice(0,48)} — {names[current.elements[id].effect]}</li>)}</ol>}
   <div className="f13-motion-actions"><button type="button" onClick={onPreview}><Play size={14}/> {step===undefined?'Prévia dos efeitos':'Reiniciar prévia'}</button>
    {step!==undefined&&<><button type="button" disabled={step>=order.length} onClick={onAdvance}><ChevronRight size={14}/> Próxima entrada</button>
     <button type="button" onClick={onStop}><RotateCcw size={14}/> Encerrar prévia</button><small>Etapa {step}/{order.length}</small></>}
   </div>
  </div>}
 </section>
}
