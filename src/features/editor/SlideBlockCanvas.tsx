import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { InlineBlockEdit } from './InlineBlockEdit'
import { appearanceClasses, elementAppearance } from './elementAppearance'
import { MarkdownView } from '../../components/MarkdownView'
import { SlideAutoFit } from './SlideAutoFit'
import { movingGuides, snapGeometry, resizeGeometry, RESIZE_HANDLES } from './geometryTools'
import type { ResizeHandle } from './geometryTools'
import { bounds, moveSelection } from './multiGeometry'
import { angleAt, resizeGroup, rotateBy, smartMove } from './studioGeometry'
import type { Corner, Guide } from './studioGeometry'
import type { RectSet } from './multiGeometry'
import { normalizeRect, slideCollisions } from './layoutModel'
import type { BlockRect, EditorLayout, EditorSlide, SlideBlock } from './layoutModel'

export type CanvasSelection={id:string;rect:BlockRect;members?:RectSet}
export const selectionRects=(selection:CanvasSelection|null|undefined,layout:EditorLayout):RectSet=>
  selection?Object.fromEntries(Object.entries(selection.members??{[selection.id]:selection.rect}).map(([id,rect])=>[id,layout.overrides[id]??rect])):{}
export type LayerRequest={id:string;additive:boolean}
type Props={
  onEditText?:(block:SlideBlock)=>void
  editingBlockId?:string|null
  onCommitText?:(id:string,value:string)=>boolean
  onCancelText?:()=>void
  layerRequest?:LayerRequest|null
  slide:EditorSlide
  layout:EditorLayout
  editable?:boolean
  arranging?:boolean
  snap?:boolean
  multiSelect?:boolean
  onBatchGeometry?:(updates:RectSet)=>void
  selection?:CanvasSelection|null
  onSelect?: (selection:CanvasSelection|null)=>void
  onGeometry?: (id:string,rect:BlockRect)=>void
  onGestureStart?:()=>void
  onReset?: (id:string)=>void
  onOverflow?: (count:number)=>void
}
type Drag={
  id:string
  mode:'move'|'rotate'|ResizeHandle
  pointer:number
  x:number;y:number
  width:number;height:number
  initial:BlockRect
  changed:boolean
  proportional:boolean
  members:RectSet
  peers:RectSet
  centerX:number;centerY:number;angle:number
}
const labelFor=(block:SlideBlock)=>({
  heading:'Título',paragraph:'Parágrafo',list:'Lista',image:'Imagem',
  quote:'Citação',table:'Tabela',code:'Código'
})[block.kind]

export function SlideBlockCanvas({
  slide,layout,editable=false,arranging=false,snap=true,multiSelect=false,layerRequest,selection,onSelect,onBatchGeometry,
  onGeometry,onGestureStart,onReset,onOverflow,onEditText,editingBlockId,onCommitText,onCancelText
}:Props){
  const area=useRef<HTMLDivElement>(null)
  const dragging=useRef<Drag|null>(null)
  const [overflow,setOverflow]=useState(0)
  const [overlaps,setOverlaps]=useState(0)
  const [activeGuides,setActiveGuides]=useState<Guide[]>([])
  const hasOverrides=slide.blocks.some(block=>layout.overrides[block.id])
  const separate=arranging||hasOverrides
  const editingBlock=arranging&&editable?slide.blocks.find(b=>b.id===editingBlockId&&!layout.overrides[b.id]?.locked):undefined
  const selectedBlock=slide.blocks.find(block=>block.id===selection?.id)
  const members=Object.fromEntries(Object.entries(selectionRects(selection,layout)).filter(([id])=>slide.blocks.some(b=>b.id===id))) as RectSet
  const selectedCount=Object.keys(members).length
  const selectedRect=selectedCount===1&&selectedBlock&&selection?layout.overrides[selection.id]??selection.rect:null
  const groupBounds=selectedCount>1?bounds(members):null
  const guides=selectedRect?movingGuides(selectedRect):null
  const count=Math.max(slideCollisions(slide,layout),overlaps)

  useEffect(()=>{
    const stage=area.current
    if(!stage||!separate){setOverflow(0);setOverlaps(0);return}
    let pending=0
    const inspect=()=>{
      pending=0
      const elements=[...stage.querySelectorAll<HTMLElement>('[data-slide-block]')]
      const stageRect=stage.getBoundingClientRect()
      const clipped=elements.filter(node=>{
        if(!node.classList.contains('f4-pinned'))return false
        const r=node.getBoundingClientRect()
        return node.scrollHeight>node.clientHeight+3||node.scrollWidth>node.clientWidth+3||
          r.left<stageRect.left-3||r.right>stageRect.right+3||r.top<stageRect.top-3||r.bottom>stageRect.bottom+3
      }).length
      setOverflow(current=>current===clipped?current:clipped)
      onOverflow?.(clipped)
      let collisions=0
      const rectangles=elements.map(x=>x.getBoundingClientRect())
      for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){
        const a=rectangles[i],b=rectangles[j]
        if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>4&&
          Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>4)collisions++
      }
      setOverlaps(current=>current===collisions?current:collisions)
    }
    const schedule=()=>{if(!pending)pending=requestAnimationFrame(inspect)}
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule)
    observer?.observe(stage)
    stage.querySelectorAll<HTMLElement>('[data-slide-block]').forEach(x=>observer?.observe(x))
    const load=()=>schedule()
    stage.addEventListener('load',load,true)
    schedule()
    return ()=>{
      if(pending)cancelAnimationFrame(pending)
      observer?.disconnect();stage.removeEventListener('load',load,true)
    }
  },[slide,layout,separate,onOverflow])

  function initial(node:HTMLElement):BlockRect{
    const stage=area.current?.getBoundingClientRect()
    const item=node.getBoundingClientRect()
    const width=Math.max(stage?.width||1,1),height=Math.max(stage?.height||1,1)
    return normalizeRect({
      x:(item.left-(stage?.left||0))/width,
      y:(item.top-(stage?.top||0))/height,
      // Use the rendered bounds of the selected element, not the entire slide.
      // The layout schema's small minimums apply only to very tiny items.
      w:Math.max(item.width/width,.08),
      h:Math.max(item.height/height,.05),z:4
    })??{x:.1,y:.1,w:.7,h:.24,z:4}
  }

  // The intrinsic size of an unpinned element can change with images, zoom or
  // viewport width. Keep the overlay in sync without persisting a new override.
  useEffect(()=>{
    if(!arranging||!selection||!selectedBlock||selection.members||layout.overrides[selection.id])return
    const stage=area.current
    const node=Array.from(stage?.querySelectorAll<HTMLElement>('[data-slide-block]')??[])
      .find(item=>item.dataset.slideBlock===selection.id)
    if(!stage||!node)return
    let pending=0
    const measure=()=>{
      pending=0
      if(dragging.current)return
      const rect=initial(node)
      const previous=selection.rect
      if(Math.max(Math.abs(rect.x-previous.x),Math.abs(rect.y-previous.y),
        Math.abs(rect.w-previous.w),Math.abs(rect.h-previous.h))>.002){
        onSelect?.({id:selection.id,rect})
      }
    }
    const schedule=()=>{if(!pending)pending=requestAnimationFrame(measure)}
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule)
    observer?.observe(stage);observer?.observe(node)
    node.addEventListener('load',schedule,true)
    schedule()
    return ()=>{
      if(pending)cancelAnimationFrame(pending)
      observer?.disconnect();node.removeEventListener('load',schedule,true)
    }
  },[arranging,selection,selectedBlock,layout.overrides,onSelect])

  function select(block:SlideBlock,node:HTMLElement,additive=false,retain=false):RectSet{
    const rect=layout.overrides[block.id]??initial(node)
    const group=rect.group
    const related:RectSet={[block.id]:rect}
    if(group)for(const other of slide.blocks){
      const r=layout.overrides[other.id]
      if(r?.group===group)related[other.id]=r
    }
    let chosen:RectSet
    if(additive){
      chosen={...members}
      if(Object.keys(related).every(id=>chosen[id]))for(const id of Object.keys(related))delete chosen[id]
      else Object.assign(chosen,related)
    }else if(retain&&members[block.id])chosen=members
    else chosen=related
    const keys=Object.keys(chosen)
    if(!keys.length){onSelect?.(null);return chosen}
    const id=chosen[block.id]?block.id:keys[0]
    onSelect?.({id,rect:chosen[id],...(keys.length>1?{members:chosen}:{})})
    return chosen
  }

  useEffect(()=>{
    if(!arranging||!editable||!layerRequest)return
    const block=slide.blocks.find(b=>b.id===layerRequest.id)
    const node=Array.from(area.current?.querySelectorAll<HTMLElement>('[data-slide-block]')??[])
      .find(item=>item.dataset.slideBlock===layerRequest.id)
    if(block&&node)select(block,node,layerRequest.additive)
    // React to a new explicit layer selection request only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[layerRequest])

  function pointerDown(event:ReactPointerEvent<HTMLElement>,block:SlideBlock,mode:'move'|'rotate'|ResizeHandle){
    if(!editable||!arranging||editingBlock||event.button!==0)return
    if(mode==='move' && (event.target as HTMLElement).closest('button,a,input,textarea,select'))return
    event.preventDefault()
    event.stopPropagation()
    const node=Array.from(area.current?.querySelectorAll<HTMLElement>('[data-slide-block]')??[])
      .find(item=>item.dataset.slideBlock===block.id)
    const stage=area.current?.getBoundingClientRect()
    if(!node||!stage)return
    const additive=mode==='move'&&(multiSelect||event.shiftKey||event.ctrlKey||event.metaKey)
    const chosen=select(block,node,additive,!additive)
    event.currentTarget.focus({preventScroll:true})
    if(additive||Object.values(chosen).some(r=>r.locked)||!chosen[block.id])return
    const rect=chosen[block.id]
    const peers:RectSet={}
    for(const other of Array.from(area.current?.querySelectorAll<HTMLElement>('[data-slide-block]')??[])){
      const id=other.dataset.slideBlock
      if(id&&!chosen[id])peers[id]=layout.overrides[id]??initial(other)
    }
    const centerX=stage.left+(rect.x+rect.w/2)*stage.width
    const centerY=stage.top+(rect.y+rect.h/2)*stage.height
    dragging.current={id:block.id,mode,pointer:event.pointerId,x:event.clientX,y:event.clientY,
      initial:rect,width:stage.width||1,height:stage.height||1,changed:false,proportional:block.kind==='image',members:chosen,peers,centerX,centerY,
      angle:angleAt(event.clientX,event.clientY,centerX,centerY)}
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function pointerMove(event:ReactPointerEvent<HTMLElement>){
    const active=dragging.current
    if(!active||active.pointer!==event.pointerId)return
    const deltaX=event.clientX-active.x,deltaY=event.clientY-active.y
    if(!active.changed){
      if(Math.hypot(deltaX,deltaY)<3)return
      active.changed=true
      onGestureStart?.()
    }
    const x=deltaX/active.width,y=deltaY/active.height
    const count=Object.keys(active.members).length
    if(active.mode==='rotate'){
      if(count===1)onGeometry?.(active.id,rotateBy(active.initial,
        angleAt(event.clientX,event.clientY,active.centerX,active.centerY)-active.angle,event.shiftKey))
      return
    }
    if(active.mode==='move'){
      const target=snapGeometry({...active.initial,x:active.initial.x+x,y:active.initial.y+y},'move',snap&&!event.altKey)
      const deltaX=target.x-active.initial.x,deltaY=target.y-active.initial.y
      const result=snap&&!event.altKey?smartMove(active.members,active.peers,x,y,6/active.width,6/active.height):null
      const updates=result?.guides.length?result.updates:moveSelection(active.members,deltaX,deltaY)
      setActiveGuides(result?.guides??[])
      if(count>1)onBatchGeometry?.(updates)
      else if(updates[active.id])onGeometry?.(active.id,updates[active.id])
      return
    }
    if(count>1){
      if(['nw','ne','sw','se'].includes(active.mode))onBatchGeometry?.(resizeGroup(active.members,active.mode as Corner,x,y))
      return
    }
    const next=resizeGeometry(active.initial,active.mode,x,y,snap&&!event.altKey,active.proportional||event.shiftKey)
    onGeometry?.(active.id,next)
  }
  function pointerUp(event:ReactPointerEvent<HTMLElement>){
    if(dragging.current?.pointer===event.pointerId){
      pointerMove(event)
      dragging.current=null
      setActiveGuides([])
    }
  }
  function keyDown(event:ReactKeyboardEvent<HTMLElement>,block:SlideBlock,mode:'move'|ResizeHandle){
    if(!arranging||!editable||editingBlock)return
    const steps:Record<string,[number,number]>={
      ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]
    }
    if(event.key==='Escape'){event.preventDefault();onSelect?.(null);return}
    if(mode==='move'&&(event.key==='Enter'||event.key===' ')){
      event.preventDefault();select(block,event.currentTarget,multiSelect||event.shiftKey||event.ctrlKey||event.metaKey);return
    }
    const direction=steps[event.key]
    if(!direction)return
    event.preventDefault();event.stopPropagation()
    const node=Array.from(area.current?.querySelectorAll<HTMLElement>('[data-slide-block]')??[])
      .find(item=>item.dataset.slideBlock===block.id)
    if(!node)return
    const chosen=select(block,node,false,true)
    if(Object.values(chosen).some(r=>r.locked)||!chosen[block.id])return
    const rect=chosen[block.id]
    const step=event.shiftKey?.05:.01
    const x=direction[0]*step,y=direction[1]*step
    if(mode==='move'&&Object.keys(chosen).length>1){
      onGestureStart?.();onBatchGeometry?.(moveSelection(chosen,x,y));return
    }
    if(mode!=='move'&&Object.keys(chosen).length>1){
      if(['nw','ne','sw','se'].includes(mode)){onGestureStart?.();onBatchGeometry?.(resizeGroup(chosen,mode as Corner,x,y))}
      return
    }
    const next=mode==='move'?normalizeRect({...rect,x:rect.x+x,y:rect.y+y})
      :resizeGeometry(rect,mode,x,y,false,block.kind==='image')
    if(next){
      onGestureStart?.()
      onGeometry?.(block.id,next)
    }
  }

  return <div className={'f7-canvas-wrap '+(arranging?'f7-editing':'')}>
    <div ref={area} className={'f4-content-area f7-canvas '+(arranging?'f4-arranging':'')}
      onPointerDown={event=>{
        if(arranging&&event.target===event.currentTarget)onSelect?.(null)
      }}>
      {!separate
        ?<SlideAutoFit markdown={slide.slide.markdown} layout={slide.slide.layout}/>
        :slide.blocks.map(block=>{
          const rect=layout.overrides[block.id]
          const chosen=Boolean(members[block.id])
          const style:CSSProperties|undefined=rect?{
            position:'absolute',left:rect.x*100+'%',top:rect.y*100+'%',
            width:rect.w*100+'%',height:rect.h*100+'%',zIndex:rect.z,...elementAppearance(rect),transform:rect.rotation?'rotate('+rect.rotation+'deg)':undefined
          }:undefined
          return <div key={block.id} data-slide-block={block.id}
            className={'f4-block f7-editor-block '+(rect?'f4-pinned ':'')+(chosen?'f7-selected ':'')+(arranging&&rect?.locked?'f9-locked ':'')+' '+appearanceClasses(rect,block.kind)}
            style={style} tabIndex={arranging?0:undefined}
            role={arranging?'button':undefined}
            aria-label={arranging?'Selecionar e mover '+labelFor(block):undefined}
            aria-pressed={arranging?chosen:undefined}
            onDoubleClick={event=>{if(arranging&&editable&&!rect?.locked&&(block.kind==='heading'||block.kind==='paragraph')){event.preventDefault();onEditText?.(block)}}}
            onPointerDown={event=>pointerDown(event,block,'move')}
            onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={()=>{dragging.current=null;setActiveGuides([])}}
            onKeyDown={event=>{if(event.target===event.currentTarget)keyDown(event,block,'move')}}>
            <MarkdownView markdown={block.markdown}/>
          </div>
        })}
      {arranging&&editable&&!editingBlock&&selectedBlock&&selectedRect&&<div className="f8-selection-frame"
        style={{left:selectedRect.x*100+'%',top:selectedRect.y*100+'%',
          width:selectedRect.w*100+'%',height:selectedRect.h*100+'%',
          transform:selectedRect.rotation?'rotate('+selectedRect.rotation+'deg)':undefined}}>
        {!selectedRect.locked&&<button className="f10-rotate-handle" type="button" title="Gire arrastando; Shift encaixa a 15°" aria-label="Girar livremente"
          onPointerDown={event=>pointerDown(event,selectedBlock,'rotate')} onPointerMove={pointerMove} onPointerUp={pointerUp}
          onPointerCancel={()=>{dragging.current=null;setActiveGuides([])}}
          onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();onGestureStart?.();onGeometry?.(selectedBlock.id,rotateBy(selectedRect,event.key==='ArrowLeft'?-1:1,event.shiftKey))}}}><RotateCw size={13}/></button>}
        {selectedRect.locked&&<span className="f9-locked-tag">Bloqueado</span>}
        {!selectedRect.locked&&!selectedRect.rotation&&RESIZE_HANDLES.map(handle=><button key={handle.id} type="button"
          className={'f8-handle f8-handle-'+handle.id}
          aria-label={handle.label} title={handle.label}
          onPointerDown={event=>pointerDown(event,selectedBlock,handle.id)}
          onPointerMove={pointerMove} onPointerUp={pointerUp}
          onPointerCancel={()=>{dragging.current=null;setActiveGuides([])}}
          onKeyDown={event=>keyDown(event,selectedBlock,handle.id)}/>)}
      </div>}
      {!editingBlock&&arranging&&groupBounds&&<div className="f9-group-frame" aria-label={selectedCount+' elementos selecionados'}
        style={{left:groupBounds.x*100+'%',top:groupBounds.y*100+'%',width:groupBounds.w*100+'%',height:groupBounds.h*100+'%'}}>
        {editable&&selectedBlock&&!Object.values(members).some(r=>r.locked||r.rotation)&&RESIZE_HANDLES.filter(h=>['nw','ne','sw','se'].includes(h.id)).map(handle=><button key={handle.id} type="button"
          className={'f8-handle f8-handle-'+handle.id} aria-label={'Grupo: '+handle.label}
          onPointerDown={event=>pointerDown(event,selectedBlock,handle.id)} onPointerMove={pointerMove} onPointerUp={pointerUp}
          onPointerCancel={()=>{dragging.current=null;setActiveGuides([])}} onKeyDown={event=>keyDown(event,selectedBlock,handle.id)}/>)}
      </div>}
      {arranging&&activeGuides.map(g=><div key={g.axis} className={'f10-smart-guide f10-guide-'+g.axis} aria-hidden="true" style={g.axis==='x'?{left:g.value*100+'%'}:{top:g.value*100+'%'}}/>)}
      {editingBlock&&onCommitText&&onCancelText&&<InlineBlockEdit key={editingBlock.id} block={editingBlock}
        onSave={value=>onCommitText(editingBlock.id,value)} onCancel={onCancelText}/>}
      {arranging&&guides?.vertical&&<div className="f7-guide f7-guide-v" aria-hidden="true"/>}
      {arranging&&guides?.horizontal&&<div className="f7-guide f7-guide-h" aria-hidden="true"/>}
    </div>
    {separate&&(count>0||overflow>0)&&<div className="f7-canvas-warning" role="status">
      <AlertTriangle size={14}/>
      {count>0?count+' bloco(s) sobrepostos. ':''}
      {overflow>0?overflow+' bloco(s) com conteúdo maior que sua área. ':''}
      Selecione um bloco para ajustar tamanho ou restaurar o automático.
    </div>}
  </div>
}
