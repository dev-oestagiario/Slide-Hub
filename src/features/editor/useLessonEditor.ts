import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { supabase } from '../../lib/supabase'
import { parseSlides } from '../../lib/slideParser'
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
const same=(a:Snapshot,b:Snapshot)=>a.lessonId===b.lessonId&&a.title===b.title&&
  a.markdown===b.markdown&&layoutsEqual(a.layout,b.layout)
const cacheKey=(userId:string,lessonId:string)=>'slidehub:offline-draft:v1:'+userId+':'+lessonId

export function useLessonEditor({lesson,canEdit,autoBreak,userId,onPersist,onNotify}:Props){
  const [title,setTitleState]=useState('')
  const [markdown,setMarkdownState]=useState('')
  const [layout,setLayout]=useState<EditorLayout>(emptyLayout)
  const [saved,setSaved]=useState<Saved|null>(null)
  const [status,setStatus]=useState<DraftStatus>('saved')
  const [loadedFor,setLoadedFor]=useState('')
  const [historyNumber,setHistoryNumber]=useState(0)
  const current=useRef<Snapshot>({lessonId:'',title:'',markdown:'',layout:emptyLayout()})
  const savedRef=useRef<Saved|null>(null)
  const saving=useRef<Promise<boolean>|null>(null)
  const history=useRef<EditorLayout[]>([])
  const redoHistory=useRef<EditorLayout[]>([])

  const parsed=useMemo(()=>parseSlides(markdown,autoBreak),[markdown,autoBreak])
  const slideModel=useMemo(()=>editorSlides(parsed,layout),[parsed,layout])

  useEffect(()=>{
    const state=normalizeEditorLayout(lesson?.editor_layout)
    const next=lesson?reconcileEditorLayout(parseSlides(lesson.markdown,autoBreak),state):emptyLayout()
    const baseline:Saved|null=lesson?{lessonId:lesson.id,title:lesson.title,
      markdown:lesson.markdown,layout:state,revision:lesson.editor_revision??0}:null
    savedRef.current=baseline
    setSaved(baseline)
    setTitleState(lesson?.title||'')
    setMarkdownState(lesson?.markdown||'')
    setLayout(next)
    setStatus('saved')
    history.current=[];redoHistory.current=[];setHistoryNumber(value=>value+1)
    setLoadedFor(lesson?.id||'')
    if(!lesson||!canEdit||!userId)return
    try{
      const raw=localStorage.getItem(cacheKey(userId,lesson.id))
      if(!raw)return
      const cached=JSON.parse(raw) as {title?:string;markdown?:string;layout?:unknown;revision?:number}
      if(typeof cached.title!=='string'||typeof cached.markdown!=='string')return
      if(cached.title===lesson.title&&cached.markdown===lesson.markdown&&layoutsEqual(normalizeEditorLayout(cached.layout),state))return
      if(window.confirm('Encontramos um rascunho local desta aula. Deseja recuperar o texto e o layout?')){
        setTitleState(cached.title)
        setMarkdownState(cached.markdown)
        setLayout(reconcileEditorLayout(parseSlides(cached.markdown,autoBreak),cached.layout))
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

  const setTitle=useCallback((value:string)=>{
    setTitleState(value);setStatus('pending')
  },[])
  const setMarkdown:Dispatch<SetStateAction<string>>=useCallback(value=>{
    setMarkdownState(value);setStatus('pending')
  },[])
  current.current={lessonId:lesson?.id||'',title,markdown,layout}
  const dirty=Boolean(canEdit&&lesson&&loadedFor===lesson.id&&saved&&saved.lessonId===lesson.id&&!same(current.current,saved))
  const checkpoint=useCallback(()=>{
    history.current.push(current.current.layout)
    if(history.current.length>50)history.current.shift()
    redoHistory.current=[]
    setHistoryNumber(v=>v+1)
  },[])
  const updateGeometry=useCallback((id:string,rect:BlockRect)=>{
    setLayout(previous=>{
      const next=setBlockRect(previous,id,rect)
      return layoutsEqual(previous,next)?previous:next
    })
    setStatus('pending')
  },[])
  const resetGeometry=useCallback((id:string)=>{
    checkpoint()
    setLayout(previous=>resetBlockRect(previous,id))
    setStatus('pending')
  },[checkpoint])
  const undo=useCallback(()=>{
    const previous=history.current.pop()
    if(!previous)return
    redoHistory.current.push(current.current.layout)
    setLayout(previous);setStatus('pending');setHistoryNumber(v=>v+1)
  },[])
  const redo=useCallback(()=>{
    const next=redoHistory.current.pop()
    if(!next)return
    history.current.push(current.current.layout)
    setLayout(next);setStatus('pending');setHistoryNumber(v=>v+1)
  },[])
  const canUndo=historyNumber>=0&&history.current.length>0
  const canRedo=historyNumber>=0&&redoHistory.current.length>0

  async function flush():Promise<boolean>{
    if(!canEdit||!supabase||!lesson||!userId||loadedFor!==lesson.id)return false
    if(saving.current)return saving.current
    const target=lesson.id
    const job=(async()=>{
      let attempts=0
      while(attempts++<12){
        const baseline=savedRef.current
        const snapshot=current.current
        if(!baseline||snapshot.lessonId!==target||baseline.lessonId!==target)return false
        if(same(snapshot,baseline)){setStatus('saved');return true}
        setStatus('saving')
        const {data,error}=await supabase.from('lessons').update({
          title:snapshot.title.trim()||lesson.title,markdown:snapshot.markdown,editor_layout:snapshot.layout
        }).eq('id',target).eq('editor_revision',baseline.revision).select('*').maybeSingle()
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
    saving.current=job
    try{return await job}
    finally{saving.current=null}
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
    title,markdown,layout,parsed,slideModel,dirty,status,ready:loadedFor===lesson?.id,
    setTitle,setMarkdown,updateGeometry,resetGeometry,checkpoint,undo,redo,canUndo,canRedo,
    save:flush
  }
}
