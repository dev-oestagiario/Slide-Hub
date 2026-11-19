import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { supabase } from '../../lib/supabase'
import { parseSlides } from '../../lib/slideParser'
import { paginateSlides } from './autoOrganizer'
import { editVisibleBlock } from './sourceEdits'
import { changeSlide } from './slideOperations'
import type { SlideOperation } from './slideOperations'
import { cleanMotion } from './motionModel'
import type { MotionLayout } from './motionModel'
import { setBlockRects } from './multiGeometry'
import type { RectSet } from './multiGeometry'
import type { Lesson } from '../courses/types'
import {
  emptyLayout, editorSlides, layoutsEqual, normalizeEditorLayout,
  reconcileEditorLayout, resetBlockRect, setBlockRect
} from './layoutModel'
import type { BlockRect, EditorLayout } from './layoutModel'

export type DraftStatus = 'saved' | 'pending' | 'saving' | 'error'
type Props={
  lesson:Lesson|undefined
  canEdit:boolean
  autoBreak:boolean
  userId?:string
  onPersist:(row:Lesson)=>void
  onNotify:(message:string)=>void
}
type Saved={lessonId:string;title:string;markdown:string;layout:EditorLayout;revision:number}
type Snapshot={lessonId:string;title:string;markdown:string;layout:EditorLayout}
const same=(a:Snapshot,b:Snapshot)=>a.lessonId===b.lessonId&&a.title.trim()===b.title.trim()&&
  a.markdown===b.markdown&&layoutsEqual(a.layout,b.layout)
const cacheKey=(userId:string,lessonId:string)=>'slidehub:offline-draft:v1:'+userId+':'+lessonId

export function useLessonEditor({lesson,canEdit,autoBreak,userId,onPersist,onNotify}:Props){
  const [title,setTitleState]=useState('')
  const [markdown,setMarkdownState]=useState('')
  const [layout,setLayout]=useState<EditorLayout>(emptyLayout)
  const [saved,setSaved]=useState<Saved|null>(null)
  const [status,setStatus]=useState<DraftStatus>('saved')
  const [loadedFor,setLoadedFor]=useState('')
  const [originalSlideKeys,setOriginalSlideKeys]=useState<string[]>([])
  const [historyNumber,setHistoryNumber]=useState(0)
  const current=useRef<Snapshot>({lessonId:'',title:'',markdown:'',layout:emptyLayout()})
  const savedRef=useRef<Saved|null>(null)
  const saving=useRef<{lessonId:string;job:Promise<boolean>}|null>(null)
  const history=useRef<Snapshot[]>([])
  const redoHistory=useRef<Snapshot[]>([])
  const typing=useRef<{field:'title'|'markdown';time:number}|null>(null)

  const parsed=useMemo(()=>paginateSlides(parseSlides(markdown,autoBreak)),[markdown,autoBreak])
  const slideModel=useMemo(()=>editorSlides(parsed,layout),[parsed,layout])

  useEffect(()=>{
    const state=normalizeEditorLayout(lesson?.editor_layout)
    const originalSlides=lesson?paginateSlides(parseSlides(lesson.markdown,autoBreak)):[]
    const next=lesson?reconcileEditorLayout(originalSlides,state):emptyLayout()
    setOriginalSlideKeys(editorSlides(originalSlides,next).map(slide=>slide.key))
    const baseline:Saved|null=lesson?{lessonId:lesson.id,title:lesson.title,
      markdown:lesson.markdown,layout:state,revision:lesson.editor_revision??0}:null
    savedRef.current=baseline
    setSaved(baseline)
    setTitleState(lesson?.title||'')
    setMarkdownState(lesson?.markdown||'')
    setLayout(next)
    setStatus('saved')
    history.current=[];redoHistory.current=[];typing.current=null;setHistoryNumber(value=>value+1)
    setLoadedFor(lesson?.id||'')
    if(!lesson||!canEdit||!userId)return
    try{
      const raw=localStorage.getItem(cacheKey(userId,lesson.id))
      if(!raw)return
      const cached=JSON.parse(raw) as {title?:string;markdown?:string;layout?:unknown;revision?:number}
      if(typeof cached.title!=='string'||typeof cached.markdown!=='string')return
      if(cached.title===lesson.title&&cached.markdown===lesson.markdown&&layoutsEqual(normalizeEditorLayout(cached.layout),state))return
      const stale=cached.revision!==undefined&&cached.revision!==(lesson.editor_revision??0)
      const notice=stale
        ?'Este rascunho foi criado a partir de uma revisão anterior da aula. Recuperá-lo pode substituir alterações mais recentes. Deseja recuperar o texto e o layout?'
        :'Encontramos um rascunho local desta aula. Deseja recuperar o texto e o layout?'
      if(window.confirm(notice)){
        setTitleState(cached.title)
        setMarkdownState(cached.markdown)
        setLayout(reconcileEditorLayout(paginateSlides(parseSlides(cached.markdown,autoBreak)),cached.layout))
        setStatus('pending')
      } else localStorage.removeItem(cacheKey(userId,lesson.id))
    }catch{/* Browser storage is optional; editing still works */}
    // Deliberately only reset when switching lessons, not on every server autosave result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[lesson?.id])

  useEffect(()=>{
    if(!lesson||loadedFor!==lesson.id)return
    setLayout(previous=>{
      const next=reconcileEditorLayout(parsed,previous)
      return layoutsEqual(next,previous)?previous:next
    })
  },[parsed,lesson?.id,loadedFor])

  current.current={lessonId:lesson?.id||'',title,markdown,layout}
  const dirty=Boolean(canEdit&&lesson&&loadedFor===lesson.id&&saved&&saved.lessonId===lesson.id&&!same(current.current,saved))
  const checkpoint=useCallback(()=>{
    typing.current=null
    const snapshot=current.current
    const last=history.current.at(-1)
    if(!last||!same(last,snapshot))history.current.push(snapshot)
    if(history.current.length>50)history.current.shift()
    redoHistory.current=[]
    setHistoryNumber(v=>v+1)
  },[])
  function checkpointTyping(field:'title'|'markdown'){
    const now=Date.now()
    if(typing.current?.field!==field||now-typing.current.time>900)checkpoint()
    typing.current={field,time:now}
  }
  const setTitle=(value:string)=>{
    if(!canEdit||current.current.lessonId!==lesson?.id||loadedFor!==lesson?.id||value===current.current.title)return
    checkpointTyping('title')
    current.current={...current.current,title:value}
    setTitleState(value);setStatus('pending')
  }
  const setMarkdown:Dispatch<SetStateAction<string>>=value=>{
    if(!canEdit||current.current.lessonId!==lesson?.id||loadedFor!==lesson?.id)return
    const before=current.current
    const next=typeof value==='function'?value(before.markdown):value
    if(next===before.markdown)return
    checkpointTyping('markdown')
    const nextLayout=reconcileEditorLayout(paginateSlides(parseSlides(next,autoBreak)),before.layout)
    current.current={...before,markdown:next,layout:nextLayout}
    setMarkdownState(next);setLayout(nextLayout);setStatus('pending')
  }
  const updateGeometry=useCallback((id:string,rect:BlockRect)=>{
    setLayout(previous=>{
      if(previous.overrides[id]?.locked)return previous
      const next=setBlockRect(previous,id,rect)
      return layoutsEqual(previous,next)?previous:next
    })
    setStatus('pending')
  },[])
  const updateGeometries=useCallback((updates:RectSet)=>{
    setLayout(previous=>setBlockRects(previous,updates));setStatus('pending')
  },[])
  const changeBlockSource=useCallback((id:string,value:string,mode:'edit'|'duplicate',rect?:BlockRect)=>{
    if(!canEdit||current.current.lessonId!==lesson?.id||loadedFor!==lesson?.id)return false
    const snapshot=current.current
    const result=editVisibleBlock(snapshot.markdown,snapshot.layout,id,value,autoBreak,mode,rect)
    if(!result){onNotify('Não foi possível identificar este bloco com segurança. Edite o Markdown na área Escrever.');return false}
    checkpoint()
    current.current={...snapshot,markdown:result.markdown,layout:result.layout}
    setMarkdownState(result.markdown);setLayout(result.layout);setStatus('pending')
    return true
  },[canEdit,loadedFor,lesson?.id,autoBreak,onNotify,checkpoint])
  function slideOperation(page:number,op:SlideOperation):number|null{
    if(!canEdit||current.current.lessonId!==lesson?.id||loadedFor!==lesson?.id)return null
    const snapshot=current.current
    const next=changeSlide(snapshot.markdown,snapshot.layout,page,autoBreak,op)
    if(!next){onNotify('Não foi possível modificar esta seção. Verifique a estrutura no editor Escrever.');return null}
    checkpoint()
    current.current={...snapshot,markdown:next.markdown,layout:next.layout}
    setMarkdownState(next.markdown);setLayout(next.layout);setStatus('pending')
    return next.page
  }
  function updateMotion(value:MotionLayout){
    if(!canEdit||loadedFor!==lesson?.id||current.current.lessonId!==lesson?.id)return
    const before=current.current
    const {motion:ignored,...rest}=before.layout
    const motion=cleanMotion(value,rest.blocks)
    const next={...rest,...(motion?{motion}:{})}
    if(layoutsEqual(before.layout,next))return
    checkpoint()
    current.current={...before,layout:next}
    setLayout(next);setStatus('pending')
  }
  const resetGeometry=useCallback((id:string)=>{
    if(current.current.layout.overrides[id]?.locked)return
    checkpoint()
    setLayout(previous=>resetBlockRect(previous,id))
    setStatus('pending')
  },[checkpoint])
  function restore(snapshot:Snapshot){
    const nextLayout=reconcileEditorLayout(paginateSlides(parseSlides(snapshot.markdown,autoBreak)),snapshot.layout)
    current.current={...snapshot,layout:nextLayout}
    typing.current=null
    setTitleState(snapshot.title);setMarkdownState(snapshot.markdown);setLayout(nextLayout)
    setStatus('pending');setHistoryNumber(v=>v+1)
  }
  const undo=()=>{
    const previous=history.current.pop()
    if(!previous||previous.lessonId!==current.current.lessonId)return
    redoHistory.current.push(current.current);restore(previous)
  }
  const redo=()=>{
    const next=redoHistory.current.pop()
    if(!next||next.lessonId!==current.current.lessonId)return
    history.current.push(current.current);restore(next)
  }
  const canUndo=historyNumber>=0&&history.current.length>0
  const canRedo=historyNumber>=0&&redoHistory.current.length>0

  async function flush():Promise<boolean>{
    if(!canEdit||!supabase||!lesson||!userId||loadedFor!==lesson.id)return false
    if(saving.current?.lessonId===lesson.id)return saving.current.job
    const target=lesson.id
    const job=(async()=>{
      let attempts=0
      while(attempts++<12){
        const baseline=savedRef.current
        const snapshot=current.current
        if(!baseline||snapshot.lessonId!==target||baseline.lessonId!==target)return false
        if(same(snapshot,baseline)){setStatus('saved');return true}
        if(!snapshot.title.trim()){
          setStatus('error')
          onNotify('O título da aula não pode ficar vazio.')
          return false
        }
        setStatus('saving')
        const {data,error}=await supabase.from('lessons').update({
          title:snapshot.title.trim()||lesson.title,markdown:snapshot.markdown,editor_layout:snapshot.layout
        }).eq('id',target).eq('editor_revision',baseline.revision).select('*').maybeSingle()
        // An older request must never overwrite the state of the next lesson.
        if(current.current.lessonId!==target)return false
        if(error||!data){
          setStatus('error')
          onNotify(error?.message||'Conflito: a aula foi alterada em outra janela. Copie seu texto antes de recarregar.')
          return false
        }
        const row=data as Lesson
        const nextSaved:Saved={lessonId:target,title:row.title,
          markdown:row.markdown,layout:normalizeEditorLayout(row.editor_layout),revision:row.editor_revision??0}
        savedRef.current=nextSaved
        setSaved(nextSaved)
        onPersist(row)
        try{
          const key=cacheKey(userId,target)
          if(same(current.current,nextSaved))localStorage.removeItem(key)
        }catch{/* Optional browser cache */}
      }
      setStatus('error');onNotify('O salvamento demorou demais. Tente novamente.')
      return false
    })()
    saving.current={lessonId:target,job}
    try{return await job}
    finally{if(saving.current?.job===job)saving.current=null}
  }

  useEffect(()=>{
    if(!lesson||loadedFor!==lesson.id||!dirty||!canEdit||!userId)return
    try{
      localStorage.setItem(cacheKey(userId,lesson.id),JSON.stringify({
        title,markdown,layout,revision:savedRef.current?.revision??0
      }))
    }catch{/* Private mode/quota: keep working in memory */}
    if(status==='error')return
    const timer=window.setTimeout(()=>{void flush()},1100)
    return ()=>window.clearTimeout(timer)
    // flush uses refs to serialize latest version, not a stale render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[lesson?.id,loadedFor,canEdit,userId,dirty,title,markdown,layout,status])

  return {
    title,markdown,layout,parsed,slideModel,originalSlideKeys,dirty,status,ready:loadedFor===lesson?.id,
    setTitle,setMarkdown,changeBlockSource,slideOperation,updateMotion,updateGeometry,updateGeometries,resetGeometry,checkpoint,undo,redo,canUndo,canRedo,
    save:flush
  }
}
