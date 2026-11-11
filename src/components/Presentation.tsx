import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { BookOpenText, ChevronLeft, ChevronRight, Keyboard, List, Maximize2, Minimize2, X } from 'lucide-react'
import { MarkdownView } from './MarkdownView'
import {
  firstSlide, lastSlide, nextSlide, presentationKeyAction, previousSlide
} from '../lib/presentationNavigation'
import { useModalFocus } from '../lib/useModalFocus'
import { slideBackgroundStyle, themeForSlide } from '../lib/slideThemes'
import type { SlideTheme } from '../lib/slideThemes'
import type { Slide } from '../lib/slideParser'
import type { PresentationTemplateConfig } from '../features/templates/model'
import { inferSlideKind, visualThemeForSlide } from '../features/templates/model'
import { TemplateChrome } from '../features/templates/TemplateChrome'
import { SlideBlockCanvas } from '../features/editor/SlideBlockCanvas'
import type { EditorSlide, EditorLayout } from '../features/editor/layoutModel'

export type PresentationTheme = SlideTheme

type SpeakerNote = { slide_index:number; slide_key?:string|null; notes:string }
type PresentationProps = {
  slides:Slide[]
  title:string
  theme:PresentationTheme
  template?:PresentationTemplateConfig|null
  notes:SpeakerNote[]
  editorLayout?:EditorLayout
  editorSlides?:EditorSlide[]
  canEdit:boolean
  onClose:()=>void
}

function slideLabel(slide:Slide,index:number){
  const heading=slide.markdown.match(/^\s*#{1,3}\s+(.+)$/m)?.[1]?.trim()
  return heading ? heading.slice(0,70) : 'Slide '+(index+1)
}

/** Projection mode never edits Markdown; teacher-only controls stay outside the slide. */
export function Presentation({
  slides,title,theme,template,notes,editorLayout,editorSlides,canEdit,onClose
}:PresentationProps) {
  const [index,setIndex]=useState(0)
  const [showSolution,setShowSolution]=useState(false)
  const [speakerMode,setSpeakerMode]=useState(false)
  const [showOutline,setShowOutline]=useState(false)
  const [showHelp,setShowHelp]=useState(false)
  const [isFullscreen,setIsFullscreen]=useState(false)
  const [started]=useState(()=>Date.now())
  const [elapsed,setElapsed]=useState(0)
  const onCloseRef=useRef(onClose)
  const dialog=useRef<HTMLDivElement>(null)
  useModalFocus(dialog)
  useEffect(()=>{onCloseRef.current=onClose},[onClose])

  useEffect(()=>{
    const timer=window.setInterval(()=>setElapsed(Math.floor((Date.now()-started)/1000)),1000)
    return ()=>window.clearInterval(timer)
  },[started])
  useEffect(()=>{
    const update=()=>setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange',update)
    update()
    return ()=>document.removeEventListener('fullscreenchange',update)
  },[])
  useEffect(()=>{
    setIndex(value=>Math.min(value,lastSlide(slides.length)))
  },[slides.length])
  useEffect(()=>{
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        event.preventDefault()
        if(showHelp){setShowHelp(false);return}
        if(showOutline){setShowOutline(false);return}
        onCloseRef.current()
        return
      }
      if(event.ctrlKey||event.altKey||event.metaKey)return
      const target=event.target
      if(target instanceof HTMLElement
        && target.closest('input,textarea,select,[contenteditable="true"],button,a,summary'))return
      const action=presentationKeyAction(event.key)
      if(!action)return
      event.preventDefault()
      if(action==='next'){setIndex(n=>nextSlide(n,slides.length));setShowSolution(false)}
      if(action==='previous'){setIndex(n=>previousSlide(n));setShowSolution(false)}
      if(action==='first'){setIndex(firstSlide());setShowSolution(false)}
      if(action==='last'){setIndex(lastSlide(slides.length));setShowSolution(false)}
      if(action==='help')setShowHelp(open=>!open)
      if(action==='outline')setShowOutline(open=>!open)
      if(action==='fullscreen')toggleFullscreen()
    }
    window.addEventListener('keydown',onKeyDown)
    return ()=>window.removeEventListener('keydown',onKeyDown)
  },[showHelp,showOutline,slides.length])

  const slide=slides[index]??slides[0]
  if(!slide)return null
  const slideKind=inferSlideKind(slide,index)
  const colors=visualThemeForSlide(template??null,themeForSlide(theme,slide.theme),slideKind)
  const followingSlide=slides[index+1]
  const currentEditorSlide=editorSlides?.[index]
  const manuallyArranged=Boolean(currentEditorSlide?.blocks.some(block=>editorLayout?.overrides[block.id]))
  const currentNote=notes.find(note=>note.slide_key&&note.slide_key===currentEditorSlide?.key)
    ??notes.find(note=>!note.slide_key&&note.slide_index===index)

  function advance(direction:'previous'|'next'){
    setIndex(n=>direction==='next'?nextSlide(n,slides.length):previousSlide(n))
    setShowSolution(false)
  }
  function jumpTo(destination:number){
    setIndex(Math.min(lastSlide(slides.length),Math.max(0,destination)))
    setShowSolution(false)
    setShowOutline(false)
    dialog.current?.focus()
  }
  function toggleFullscreen(){
    if(document.fullscreenElement){
      void document.exitFullscreen().catch(()=>undefined)
    }else{
      void document.documentElement.requestFullscreen?.().catch(()=>undefined)
    }
  }

  return <div ref={dialog} tabIndex={-1} data-modal-autofocus
    className="slideshow f5-slideshow" role="dialog" aria-modal="true"
    aria-label={'Apresentação da aula: '+title} style={slideBackgroundStyle(colors)}>
    <header className="slide-header f5-presenter-header">
      <span title={title}>{title}</span>
      <div className="f5-presenter-header-actions">
        {canEdit&&<button onClick={()=>setSpeakerMode(value=>!value)}
          aria-pressed={speakerMode} aria-label={speakerMode?'Ocultar notas privadas':'Mostrar notas do professor'}>
          <BookOpenText size={18}/><span className="f5-teacher-action-text">{speakerMode?'Ocultar notas':'Modo professor'}</span>
        </button>}
        <button onClick={()=>setShowOutline(value=>!value)} aria-controls="f5-slide-outline"
          aria-expanded={showOutline} aria-label="Exibir lista de slides" title="Lista de slides (O)">
          <List size={19}/>
        </button>
        <button onClick={()=>setShowHelp(value=>!value)}
          aria-controls="f5-keyboard-help" aria-expanded={showHelp}
          aria-label="Atalhos de teclado" title="Atalhos de teclado (?)">
          <Keyboard size={19}/>
        </button>
        <button onClick={toggleFullscreen}
          aria-label={isFullscreen?'Sair da tela cheia':'Entrar em tela cheia'} title="Tela cheia (F)">
          {isFullscreen?<Minimize2 size={19}/>:<Maximize2 size={19}/>}
        </button>
        <button onClick={onClose} aria-label="Fechar apresentação" title="Fechar (Esc)"><X size={20}/></button>
      </div>
    </header>
    {showHelp&&<aside className="f5-keyboard-help" id="f5-keyboard-help" aria-label="Atalhos disponíveis">
      <strong>Atalhos da apresentação</strong>
      <p><kbd>→</kbd> <kbd>↓</kbd> <kbd>Espaço</kbd> Próximo slide
        <span><kbd>←</kbd> <kbd>↑</kbd> Slide anterior</span></p>
      <p><kbd>Home</kbd> Início <span><kbd>End</kbd> Último slide</span></p>
      <p><kbd>O</kbd> Lista de slides <span><kbd>F</kbd> Tela cheia</span>
        <span><kbd>Esc</kbd> Fechar painel ou apresentação</span></p>
    </aside>}
    {showOutline&&<nav id="f5-slide-outline" className="f5-slide-outline" aria-label="Navegação pelos slides">
      {slides.map((item,position)=><button key={position} type="button"
        className={position===index?'selected':''} aria-current={position===index?'step':undefined}
        onClick={()=>jumpTo(position)}>
        <span>{String(position+1).padStart(2,'0')}</span>
        <strong>{slideLabel(item,position)}</strong>
      </button>)}
    </nav>}
    <div className={'slide-layout f5-presenter-layout '+(speakerMode?'teacher-view':'')}>
      <section className={[
        'slide-body','layout-'+slide.layout,
        template?'f3-presentation-body':'',
        template?'f3-density-'+template.density:'',
        template?.branding.showHeader?'f3-with-header':'',
        template?.footer.text||template?.footer.showPageNumber?'f3-with-footer':''
      ].filter(Boolean).join(' ')}
        aria-label={'Slide '+(index+1)+': '+slideLabel(slide,index)}
        style={{'--slide-accent':colors.accent} as CSSProperties}>
        {!template?.branding.showHeader&&<span className="eyebrow">SLIDEHUB / {String(index+1).padStart(2,'0')}</span>}
        <div className={'slide-text '+(manuallyArranged?'f4-manual-slide':'')}>
          {currentEditorSlide&&editorLayout
            ?<SlideBlockCanvas slide={currentEditorSlide} layout={editorLayout}/>
            :<MarkdownView markdown={slide.markdown}/>}
        </div>
        {canEdit&&slide.answer&&<div className="slide-answer">
          {showSolution&&<div><strong>Gabarito</strong><MarkdownView markdown={slide.answer}/></div>}
          <button className="slide-answer-btn" onClick={()=>setShowSolution(value=>!value)}
            aria-expanded={showSolution}>{showSolution?'Ocultar solução':'Revelar gabarito'}</button>
        </div>}
        {template&&<TemplateChrome config={template} index={index} total={slides.length}/>}
      </section>
      {canEdit&&speakerMode&&<aside className="speaker-panel f5-speaker-panel">
        <h3>Notas do apresentador</h3>
        <p>Tempo: {String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}</p>
        <h4>Notas privadas</h4>
        <p>{currentNote?.notes||'Sem notas para este slide.'}</p>
        <h4>Próximo slide</h4>
        {followingSlide?<div className="speaker-next"><MarkdownView markdown={followingSlide.markdown}/></div>:<p>Fim da apresentação</p>}
      </aside>}
    </div>
    <footer className="slide-controls f5-presenter-controls">
      <div>
        <button onClick={()=>advance('previous')} disabled={index===0} aria-label="Slide anterior"><ChevronLeft/></button>
        <span role="status" aria-live="polite" aria-atomic="true">{index+1} de {slides.length}</span>
        <button onClick={()=>advance('next')} disabled={index===slides.length-1} aria-label="Próximo slide"><ChevronRight/></button>
      </div>
      <div className="slide-progress" role="progressbar" aria-label="Progresso da apresentação"
        aria-valuemin={0} aria-valuemax={slides.length} aria-valuenow={index+1}>
        <span style={{width:((index+1)/slides.length)*100+'%',background:colors.accent}}/>
      </div>
    </footer>
  </div>
}
