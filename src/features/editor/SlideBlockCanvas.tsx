import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ArrowDownRight, Grip, RotateCcw, AlertTriangle } from 'lucide-react'
import { MarkdownView } from '../../components/MarkdownView'
import type { EditorLayout, EditorSlide, BlockRect, SlideBlock } from './layoutModel'
import { normalizeRect, slideCollisions } from './layoutModel'

type Props={
  slide:EditorSlide
  layout:EditorLayout
  editable?:boolean
  arranging?:boolean
  onGeometry?: (id:string, rect:BlockRect)=>void
  onGestureStart?:()=>void
  onReset?: (id:string)=>void
  onOverflow?: (count:number)=>void
}
type Interaction={ id:string; operation:'move'|'resize'; startX:number; startY:number; origin:BlockRect; width:number;height:number }
export function SlideBlockCanvas({slide,layout,editable=false,arranging=false,onGeometry,onGestureStart,onReset,onOverflow}:Props){
  const area=useRef<HTMLDivElement>(null)
  const interaction=useRef<Interaction|null>(null)
  const [overflow,setOverflow]=useState(0)
  const [domCollisions,setDomCollisions]=useState(0)
  const collisionCount=Math.max(slideCollisions(slide,layout),domCollisions)
  const hasOverrides=slide.blocks.some(block=>layout.overrides[block.id])
  const separated=arranging || hasOverrides

  useEffect(()=>{
    const stage=area.current
    if(!stage){setOverflow(0);return}
    const inspect=()=>{
      const clipped=[...stage.querySelectorAll<HTMLElement>('.f4-pinned')].filter(node=>
        node.scrollHeight>node.clientHeight+3 || node.scrollWidth>node.clientWidth+3).length
      setOverflow(old=>old===clipped?old:clipped)
      const rendered=[...stage.querySelectorAll<HTMLElement>('[data-slide-block]')]
      let overlaps=0
      for(let i=0;i<rendered.length;i++){
        const a=rendered[i].getBoundingClientRect()
        for(let j=i+1;j<rendered.length;j++){
          const b=rendered[j].getBoundingClientRect()
          if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>3
            &&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>3)overlaps++
        }
      }
      setDomCollisions(old=>old===overlaps?old:overlaps)
      onOverflow?.(clipped)
    }
    inspect()
    if(typeof ResizeObserver==='undefined')return
    const observer=new ResizeObserver(inspect)
    observer.observe(stage)
    stage.querySelectorAll<HTMLElement>('[data-slide-block]').forEach(node=>observer.observe(node))
    return ()=>observer.disconnect()
  },[slide,layout,arranging,onOverflow])

  function initialRect(block:SlideBlock,node:HTMLElement):BlockRect {
    const outer=area.current?.getBoundingClientRect()
    const inner=node.getBoundingClientRect()
    const width=Math.max(outer?.width||1,1),height=Math.max(outer?.height||1,1)
    return normalizeRect({
      x:(inner.left-(outer?.left||0))/width,
      y:(inner.top-(outer?.top||0))/height,
      w:Math.max(inner.width/width,.12),
      h:Math.max(inner.height/height,.08),
      z:3
    })||{x:0,y:0,w:.6,h:.2,z:3}
  }
  function pointerDown(event:ReactPointerEvent<HTMLButtonElement>,block:SlideBlock,operation:'move'|'resize'){
    if(!arranging||!editable)return
    event.preventDefault()
    const node=event.currentTarget.closest<HTMLElement>('[data-slide-block]')
    const rect=layout.overrides[block.id]||(node?initialRect(block,node):null)
    const stage=area.current
    if(!rect||!stage)return
    onGestureStart?.()
    interaction.current={id:block.id,operation,startX:event.clientX,startY:event.clientY,
      origin:rect,width:stage.getBoundingClientRect().width||1,height:stage.getBoundingClientRect().height||1}
    event.currentTarget.setPointerCapture(event.pointerId)
    onGeometry?.(block.id,rect)
  }
  function pointerMove(event:ReactPointerEvent<HTMLButtonElement>){
    const moving=interaction.current
    if(!moving)return
    const dx=(event.clientX-moving.startX)/moving.width,dy=(event.clientY-moving.startY)/moving.height
    const proposed=moving.operation==='move'
      ?{...moving.origin,x:moving.origin.x+dx,y:moving.origin.y+dy}
      :{...moving.origin,w:moving.origin.w+dx,h:moving.origin.h+dy}
    const rect=normalizeRect(proposed)
    if(rect)onGeometry?.(moving.id,rect)
  }
  function pointerUp(){interaction.current=null}
  function keyMove(event:ReactKeyboardEvent<HTMLButtonElement>,block:SlideBlock,operation:'move'|'resize'){
    const steps:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}
    const direction=steps[event.key]
    if(!direction||!arranging||!editable)return
    event.preventDefault()
    const node=event.currentTarget.closest<HTMLElement>('[data-slide-block]')
    const origin=layout.overrides[block.id]||(node?initialRect(block,node):null)
    if(!origin)return
    const dx=direction[0]*(event.shiftKey?.05:.01),dy=direction[1]*(event.shiftKey?.05:.01)
    const proposed=operation==='move'?{...origin,x:origin.x+dx,y:origin.y+dy}
      :{...origin,w:origin.w+dx,h:origin.h+dy}
    const rect=normalizeRect(proposed)
    if(rect){onGestureStart?.();onGeometry?.(block.id,rect)}
  }
  return <>
    <div className={'f4-content-area '+(arranging?'f4-arranging':'')} ref={area}>
      {!separated
        ? <MarkdownView markdown={slide.slide.markdown}/>
        : slide.blocks.map(block=>{
          const rect=layout.overrides[block.id]
          const style:CSSProperties|undefined=rect?{
            position:'absolute',left:rect.x*100+'%',top:rect.y*100+'%',
            width:rect.w*100+'%',height:rect.h*100+'%',zIndex:rect.z
          }:undefined
          return <div key={block.id} data-slide-block={block.id}
            className={'f4-block '+(rect?'f4-pinned ':'')+(arranging?'f4-selectable':'')}
            style={style}>
            <MarkdownView markdown={block.markdown}/>
            {arranging&&editable&&<div className="f4-block-controls">
              <button type="button" className="f4-grip" aria-label={'Mover '+block.kind}
                title="Arrastar ou usar setas; Shift = passos maiores"
                onPointerDown={event=>pointerDown(event,block,'move')}
                onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}
                onKeyDown={event=>keyMove(event,block,'move')}><Grip size={14}/></button>
              <button type="button" className="f4-grip" aria-label={'Redimensionar '+block.kind}
                title="Arrastar ou usar setas para redimensionar"
                onPointerDown={event=>pointerDown(event,block,'resize')}
                onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}
                onKeyDown={event=>keyMove(event,block,'resize')}><ArrowDownRight size={14}/></button>
              {rect&&<button type="button" aria-label={'Restaurar posição automática de '+block.kind}
                title="Restaurar automático" onClick={()=>onReset?.(block.id)}><RotateCcw size={13}/></button>}
            </div>}
          </div>
        })}
    </div>
    {(arranging||hasOverrides) && (collisionCount>0||overflow>0) && <div className="f4-collision" role="status">
      <AlertTriangle size={14}/> {collisionCount>0?collisionCount+' sobreposição(ões) entre blocos fixados. ':''}
      {overflow>0?overflow+' bloco(s) não cabem na área escolhida. ':''}
      Amplie o bloco ou restaure o layout automático.
    </div>}
  </>
}
