import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { BookOpenText, CheckCircle2, ChevronLeft, ChevronRight, Code2, Columns3, FileText, ImagePlus, List, LayoutTemplate, Mic, Pause, Palette, Play, Plus, Quote, Save, Table2, Upload, Move, Undo2, Redo2, Download, Magnet, ZoomIn, ZoomOut, Maximize2, Minimize2, Layers } from 'lucide-react'
import { MarkdownView } from '../../components/MarkdownView'
import { articleMarkdown } from '../../lib/slideParser'
import type { Slide } from '../../lib/slideParser'
import { slideBackgroundStyle, themeForSlide } from '../../lib/slideThemes'
import type { SlideTheme } from '../../lib/slideThemes'
import type { Lesson } from '../courses/types'
import type { PresentationTemplateConfig } from '../templates/model'
import { inferSlideKind, visualThemeForSlide } from '../templates/model'
import { TemplateChrome } from '../templates/TemplateChrome'
import { SlideBlockCanvas, selectionRects } from '../editor/SlideBlockCanvas'
import { MultiElementTools } from '../editor/MultiElementTools'
import type { RectSet } from '../editor/multiGeometry'
import type { CanvasSelection, LayerRequest } from '../editor/SlideBlockCanvas'
import { LayerPanel } from '../editor/LayerPanel'
import { useModalFocus } from '../../lib/useModalFocus'
import { ElementFormatPanel } from '../editor/ElementFormatPanel'
import { MotionPanel } from '../editor/MotionPanel'
import { revealOrder } from '../editor/motionModel'
import type { MotionLayout } from '../editor/motionModel'
import { SlideLibrary } from '../editor/SlideLibrary'
import type { SlideOperation } from '../editor/slideOperations'
import { SlideInspector } from '../editor/SlideInspector'
import type { BlockRect, EditorLayout, EditorSlide } from '../editor/layoutModel'
import type { DraftStatus } from '../editor/useLessonEditor'

type Mode = 'edit' | 'article'
export type LessonWorkspaceProps = {
  lesson: Lesson
  title: string
  markdown: string
  mode: Mode
  canEdit: boolean
  busy: boolean
  dirty: boolean
  saveStatus: DraftStatus
  autoBreak: boolean
  editorReady: boolean
  editorLayout: EditorLayout
  editorSlides: EditorSlide[]
  onMotionChange:(value:MotionLayout)=>void
  onSlideOperation:(page:number,operation:SlideOperation)=>number|null
  onChangeBlockSource:(id:string,value:string,mode:'edit'|'duplicate',rect?:BlockRect)=>boolean
  onUpdateGeometry: (id:string, rect:BlockRect)=>void
  onUpdateGeometries: (rects:RectSet)=>void
  onResetGeometry: (id:string)=>void
  onGeometryStart: ()=>void
  onUndoGeometry: ()=>void
  onRedoGeometry: ()=>void
  canUndoGeometry: boolean
  canRedoGeometry: boolean
  isDictating: boolean
  theme: SlideTheme
  activeTemplate: PresentationTemplateConfig | null
  slides: Slide[]
  previewPage: number
  noteIndex: number
  noteText: string
  onTitleChange: (text: string) => void
  onMarkdownChange: Dispatch<SetStateAction<string>>
  onModeChange: (mode: Mode) => void
  onAutoBreakChange: (active: boolean) => void
  onPreviewPageChange: (index: number) => void
  onNoteIndexChange: (index: number) => void
  onNoteTextChange: (text: string) => void
  onSave: () => void
  onPublish: () => void
  onPresent: () => void
  onExport: () => void
  onOpenThemeStudio: () => void
  onOpenTemplateLibrary: () => void
  onSaveNote: () => void
  onDictate: () => void
  onImportTemplate: (file: File) => void
  onUploadContentImage: (file: File) => Promise<string>
  onNotify: (message: string) => void
}

export function LessonWorkspace({
  lesson, title, markdown, mode, canEdit, busy, dirty, saveStatus, autoBreak, editorReady,
  editorLayout, editorSlides, onMotionChange, onSlideOperation, onChangeBlockSource, onUpdateGeometry, onUpdateGeometries, onResetGeometry, onGeometryStart,
  onUndoGeometry, onRedoGeometry, canUndoGeometry, canRedoGeometry, isDictating,
  theme, activeTemplate, slides, previewPage, noteIndex, noteText,
  onTitleChange, onMarkdownChange, onModeChange, onAutoBreakChange, onPreviewPageChange,
  onNoteIndexChange, onNoteTextChange, onSave, onPublish, onPresent, onExport,
  onOpenThemeStudio, onOpenTemplateLibrary, onSaveNote, onDictate, onImportTemplate, onUploadContentImage, onNotify
}: LessonWorkspaceProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const templateRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [arranging,setArranging] = useState(false)
  const [selection,setSelection]=useState<CanvasSelection|null>(null)
  const [editingBlockId,setEditingBlockId]=useState<string|null>(null)
  const [multiSelect,setMultiSelect]=useState(false)
  const [layerRequest,setLayerRequest]=useState<LayerRequest|null>(null)
  const [layersOpen,setLayersOpen]=useState(false)
  const [libraryOpen,setLibraryOpen]=useState(false)
  const [motionPreview,setMotionPreview]=useState<number|undefined>()
  const [previewNonce,setPreviewNonce]=useState(0)
  useEffect(()=>setMotionPreview(undefined),[previewPage,lesson.id,arranging])
  const [expanded,setExpanded]=useState(false)
  const previewRef=useRef<HTMLElement>(null)
  useModalFocus(previewRef,expanded)
  useEffect(()=>{
    if(!expanded)return
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    const close=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!e.defaultPrevented)setExpanded(false)}
    window.addEventListener('keydown',close)
    return ()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',close)}
  },[expanded])
  const [snap,setSnap]=useState(true)
  const [zoom,setZoom]=useState(100)
  const [mobilePane,setMobilePane]=useState<'write'|'preview'>('write')
  useEffect(()=>{setArranging(false);setSelection(null);setLayerRequest(null);setExpanded(false);setLayersOpen(false);setLibraryOpen(false);setMobilePane('write')},[lesson.id])
  useEffect(()=>{if(mode!=='edit'||!canEdit)setExpanded(false)},[mode,canEdit])
  useEffect(()=>{setSelection(null);setLayerRequest(null);setEditingBlockId(null)},[previewPage,lesson.id])
  useEffect(()=>{if(!arranging)setEditingBlockId(null)},[arranging])
  const page = Math.min(previewPage, Math.max(0, slides.length - 1))
  const slide = slides[page]
  const slideModel = editorSlides[page]
  const selectedRects=Object.fromEntries(Object.entries(selectionRects(selection,editorLayout)).filter(([id])=>slideModel?.blocks.some(b=>b.id===id)))
  const selectedCount=Object.keys(selectedRects).length
  const selectedBlock=selectedCount===1?slideModel?.blocks.find(block=>block.id===selection?.id):undefined
  const selectedRect=selection&&(selectedBlock
    ?editorLayout.overrides[selection.id]??selection.rect:null)

  function operate(operation:SlideOperation){
    const next=onSlideOperation(page,operation)
    if(next!==null){
      setSelection(null);setLayerRequest(null);setEditingBlockId(null)
      onPreviewPageChange(next)
    }
  }
  useEffect(()=>{
    if(!canEdit||mode!=='edit'||motionPreview!==undefined)return
    const handle=(event:KeyboardEvent)=>{
      const target=event.target instanceof HTMLElement?event.target:null
      if(!target||!target.closest('.f1-editor-workspace')||target.closest('.f11-inline-edit'))return
      const typing=target.closest('input,textarea,select,[contenteditable="true"]')
      if(!(event.ctrlKey||event.metaKey)||event.altKey)return
      const key=event.key.toLowerCase()
      if(typing&&target!==editorRef.current&&target.getAttribute('aria-label')!=='Título da aula')return
      if(key==='z'||key==='y'){
        event.preventDefault()
        if(key==='y'||event.shiftKey){if(canRedoGeometry)onRedoGeometry()}
        else if(canUndoGeometry)onUndoGeometry()
      }else if(!typing&&arranging&&key==='d'&&!editingBlockId){
        if(event.shiftKey){event.preventDefault();operate({type:'duplicate'})}
        else if(selectedBlock&&selectedRect&&!selectedRect.locked&&['paragraph','image'].includes(selectedBlock.kind)){
          event.preventDefault();onChangeBlockSource(selectedBlock.id,'','duplicate',selectedRect)
        }
      }
    }
    window.addEventListener('keydown',handle)
    return ()=>window.removeEventListener('keydown',handle)
  })
  function insert(snippet: string) {
    if (!canEdit) return
    const element = editorRef.current
    const start = element?.selectionStart ?? markdown.length
    const end = element?.selectionEnd ?? markdown.length
    onMarkdownChange(current => current.slice(0, start) + snippet + current.slice(end))
    requestAnimationFrame(() => {
      element?.focus()
      element?.setSelectionRange(start + snippet.length, start + snippet.length)
    })
  }

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const url = await onUploadContentImage(file)
      insert('\n![Imagem da aula](' + url + ')\n')
      onNotify('Imagem inserida no conteúdo.')
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.')
    } finally {
      setUploading(false)
    }
  }

  return <div className="f1-editor-workspace">
    <header className="titlebar f1-editor-heading">
      <div className="f1-editor-heading-copy">
        <span className="eyebrow">ESTÚDIO DE AULAS / {lesson.status === 'published' ? 'PUBLICADA' : 'RASCUNHO'}</span>
        <input className="lesson-heading" value={title} disabled={!canEdit}
          onChange={event => onTitleChange(event.target.value)} aria-label="Título da aula"/>
        <p className="f1-editor-subtitle">{slides.length} {slides.length === 1 ? 'slide gerado' : 'slides gerados'} automaticamente
          <span aria-hidden="true"> · </span>
          <span className={saveStatus==='error' ? 'f4-save-error' : dirty ? 'f1-save-pending' : 'f1-save-ok'}
            role="status" aria-live="polite">
            {saveStatus==='error' ? 'Falha ao salvar — tente novamente' :
              saveStatus==='saving' ? 'Salvando…' : dirty ? 'Salvamento automático pendente' : 'Tudo salvo'}
          </span>
        </p>
      </div>
      <div className="actions f1-editor-actions">
        {canEdit && <button className="button subtle" onClick={onPublish}>{lesson.status === 'published' ? 'Despublicar' : 'Publicar'}</button>}
        {canEdit && <button className="button secondary" onClick={onSave} disabled={!dirty || busy}>
          <Save size={17}/> Salvar
        </button>}
        {canEdit && <button className="button secondary" onClick={onExport}
          title="Exportar slides em HTML ou imprimir como PDF">
          <Download size={17}/> Exportar
        </button>}
        <button className="button primary" onClick={onPresent} title="Apresentar usando o conteúdo atual">
          <Play size={17}/> Apresentar
        </button>
      </div>
    </header>

    <div className="toolbar f1-editor-toolbar">
      <div className="tabs" role="group" aria-label="Modo de visualização">
        <button className={mode === 'edit' ? 'selected' : ''} aria-pressed={mode === 'edit'}
          onClick={() => onModeChange('edit')}><FileText size={16}/> Escrever</button>
        <button className={mode === 'article' ? 'selected' : ''} aria-pressed={mode === 'article'}
          onClick={() => onModeChange('article')}><BookOpenText size={16}/> Apostila</button>
      </div>
      <div className="f1-toolbar-utilities">
        <label className="check"><input type="checkbox" checked={autoBreak}
          onChange={event => onAutoBreakChange(event.target.checked)}/> Títulos iniciam slides</label>
        {canEdit && <button className="button theme-launch" onClick={onOpenTemplateLibrary}><LayoutTemplate size={16}/> Templates</button>}
        {canEdit && <button className="button secondary" onClick={onOpenThemeStudio}><Palette size={16}/> Aparência</button>}
        {canEdit && <details className="advanced-template">
          <summary>Avançado</summary>
          <div><button className="button subtle" onClick={() => templateRef.current?.click()}><Upload size={15}/> Importar tema JSON</button></div>
          <input ref={templateRef} type="file" hidden accept=".json,application/json" onChange={event => {
            const file = event.target.files?.[0]
            if (file) onImportTemplate(file)
            event.target.value = ''
          }}/>
        </details>}
      </div>
    </div>

    {mode === 'edit' ? <>
      <div className="f7-mobile-switch" role="group" aria-label="Painel de edição no celular">
        <button type="button" aria-pressed={mobilePane==='write'}
          className={mobilePane==='write'?'active':''}
          onClick={()=>setMobilePane('write')}><FileText size={16}/> Escrever</button>
        <button type="button" aria-pressed={mobilePane==='preview'}
          className={mobilePane==='preview'?'active':''}
          onClick={()=>setMobilePane('preview')}><Play size={16}/> Ver slides</button>
      </div>
      <div className={'editor-grid f1-editor-grid f7-editor-grid f7-mobile-'+mobilePane}>
      <section className="editor-card f1-writing-panel" aria-label="Conteúdo da aula">
        <header className="panel-title f1-panel-head">
          <div><span className="f1-panel-kicker">01 / CRIAR</span><h2>Seu conteúdo</h2></div>
          <span className="f1-editor-type">Texto e voz</span>
        </header>
        {canEdit && <div className="format-bar f1-format-bar" role="toolbar" aria-label="Inserir conteúdo">
          <button title="Inserir título ou seção" onClick={() => insert('\n## Novo assunto\n')}><Plus size={14}/> Título</button>
          <button title="Iniciar novo slide manualmente" onClick={() => insert('\n<!-- slide -->\n')}><FileText size={14}/> Novo slide</button>
          <button title="Inserir lista" onClick={() => insert('\n- Primeiro ponto\n- Segundo ponto\n')}><List size={14}/> Lista</button>
          <button title="Inserir exercício e gabarito" onClick={() => insert('\n:::exercise\nSua pergunta\n:::\n\n:::answer\nSolução\n:::\n')}><Quote size={14}/> Exercício</button>
          <button title="Inserir imagem" disabled={uploading} onClick={() => imageRef.current?.click()}><ImagePlus size={14}/> {uploading ? 'Enviando...' : 'Imagem'}</button>
          <input ref={imageRef} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={event => {
            const file = event.target.files?.[0]
            if (file) void uploadImage(file)
            event.target.value = ''
          }}/>
          <button title="Inserir tabela" onClick={() => insert('\n| Conceito | Explicação |\n| --- | --- |\n| Exemplo | Descrição |\n')}><Table2 size={14}/> Tabela</button>
          <button title="Inserir layout de duas colunas" onClick={() => insert('\n<!-- slide: layout=split -->\n')}><Columns3 size={14}/> Colunas</button>
          <button title="Inserir trecho de código" onClick={() => insert('\n' + '`'.repeat(3) + 'javascript\n// Exemplo\n' + '`'.repeat(3) + '\n')}><Code2 size={14}/> Código</button>
          <button title="Inserir diagrama Mermaid" onClick={() => insert('\n' + '`'.repeat(3) + 'mermaid\nflowchart LR\n A --> B\n' + '`'.repeat(3) + '\n')}><Code2 size={14}/> Diagrama</button>
          <button className={'f1-dictate ' + (isDictating ? 'recording' : '')} aria-pressed={isDictating}
            title={isDictating ? 'Parar ditado' : 'Ditar conteúdo pelo microfone'}
            onClick={onDictate}>{isDictating ? <Pause size={15}/> : <Mic size={15}/>}
            {isDictating ? 'Parar ditado' : 'Ditar'}
          </button>
        </div>}
        <textarea ref={editorRef} className="code-editor f1-content-editor" spellCheck
          placeholder="Comece escrevendo sua aula...\n\n## Primeiro assunto\nExplique o conceito aqui.\n\n- Primeiro tópico\n- Segundo tópico"
          value={markdown} onChange={event => onMarkdownChange(event.target.value)}
          readOnly={!canEdit} aria-label="Editor de texto da aula"/>
        <footer className="editor-footer f1-editor-footer">
          <span>{markdown.length.toLocaleString('pt-BR')} caracteres</span>
          <span><CheckCircle2 size={14}/> O SlideHub organiza os slides enquanto você escreve</span>
        </footer>
      </section>

      <section ref={previewRef} tabIndex={expanded?-1:undefined} className={"preview-card f1-preview-panel "+(expanded?"f10-expanded":"")} role={expanded?"dialog":undefined} aria-modal={expanded?true:undefined} aria-label={expanded?"Editor visual ampliado":"Prévia automática dos slides"}>
        <header className="panel-title f1-panel-head">
          <div><span className="f1-panel-kicker">02 / VISUALIZAR</span><h2>Prévia automática</h2></div>
          <div className="preview-pagination">
            <button type="button" aria-label="Slide anterior" disabled={page === 0}
              onClick={() => onPreviewPageChange(Math.max(0,page-1))}><ChevronLeft size={17}/></button>
            <span>{page+1} / {slides.length}</span>
            <button type="button" aria-label="Próximo slide" disabled={page >= slides.length - 1}
              onClick={() => onPreviewPageChange(Math.min(slides.length-1,page+1))}><ChevronRight size={17}/></button>
          </div>
        </header>
        {canEdit && <div className="f4-layout-toolbar" role="toolbar" aria-label="Ajustes de posição">
          <button type="button" className={'f4-arrange-toggle '+(arranging?'active':'')}
            aria-pressed={arranging} disabled={!editorReady}
            onClick={()=>{if(arranging){setExpanded(false);setLayersOpen(false)}setArranging(value=>!value);setSelection(null);setLayerRequest(null)}}>
            <Move size={16}/> {arranging?'Concluir ajustes':'Organizar visualmente'}
          </button>
          <button type="button" aria-expanded={libraryOpen} onClick={()=>setLibraryOpen(v=>!v)}><LayoutTemplate size={16}/> Slides e elementos</button>
          <>
            <button type="button" disabled={!canUndoGeometry} onClick={onUndoGeometry}
              title="Desfazer alteração (Ctrl+Z)" aria-label="Desfazer alteração"><Undo2 size={16}/></button>
            <button type="button" disabled={!canRedoGeometry} onClick={onRedoGeometry}
              title="Refazer alteração (Ctrl+Y)" aria-label="Refazer alteração"><Redo2 size={16}/></button>
          </>
          {arranging&&<button type="button" className={'f7-snap-button '+(multiSelect?'active':'')} aria-pressed={multiSelect}
            onClick={()=>setMultiSelect(value=>!value)}>Seleção múltipla</button>}
          {arranging&&<button type="button" className={'f7-snap-button '+(snap?'active':'')}
            aria-pressed={snap} onClick={()=>setSnap(value=>!value)} title="Encaixar na grade">
            <Magnet size={15}/> Grade {snap?'ativada':'livre'}
          </button>}
          {arranging&&<button type="button" aria-pressed={layersOpen} onClick={()=>setLayersOpen(v=>!v)}><Layers size={16}/> Camadas</button>}
          {arranging&&<button type="button" aria-pressed={expanded} onClick={()=>setExpanded(v=>!v)}>
            {expanded?<Minimize2 size={16}/>:<Maximize2 size={16}/>} {expanded?'Fechar modo ampliado':'Ampliar editor'}
          </button>}
          <div className="f7-zoom-control" role="group" aria-label="Zoom da prévia">
            <button type="button" aria-label="Diminuir zoom" disabled={zoom===75}
              onClick={()=>setZoom(value=>Math.max(75,value-25))}><ZoomOut size={15}/></button>
            <span>{zoom}%</span>
            <button type="button" aria-label="Aumentar zoom" disabled={zoom===150}
              onClick={()=>setZoom(value=>Math.min(150,value+25))}><ZoomIn size={15}/></button>
          </div>
          <span className="f4-arrange-hint">{arranging
            ?'Selecione elementos e arraste, redimensione ou ajuste abaixo'
            :'Organização automática ativa • ajustes visuais opcionais'}</span>
        </div>}
        <div className={'f10-stage-body '+(layersOpen&&arranging?'f10-with-layers ':'')+(libraryOpen?'f12-with-library':'')}>
        {libraryOpen&&<SlideLibrary slides={slides} models={editorSlides} layout={editorLayout} theme={theme} template={activeTemplate} page={page} canEdit={canEdit&&editorReady} onPick={onPreviewPageChange} onOperation={operate}/>}
        <div className="f1-preview-stage f7-preview-stage">
          <div className="f7-preview-scroller">
          <div key={previewNonce} className={[
            motionPreview!==undefined&&slideModel&&editorLayout.motion?.transitions[slideModel.key]?'f13-transition f13-transition-'+editorLayout.motion.transitions[slideModel.key]:'',
            'mini-slide','f3-lesson-preview','f3-layout-'+slide.layout,
            activeTemplate?'f3-density-'+activeTemplate.density:'',
            activeTemplate?.branding.showHeader?'f3-with-header':'',
            activeTemplate?.footer.text||activeTemplate?.footer.showPageNumber?'f3-with-footer':''
          ].join(' ')} style={{...slideBackgroundStyle(themeForSlide(
            visualThemeForSlide(activeTemplate,theme,inferSlideKind(slide,page)),slide.theme
          )),width:zoom+'%'}}>
            <div className="f3-preview-content f4-preview-shell">
              {slideModel && <SlideBlockCanvas
                slide={slideModel} layout={editorLayout} editable={canEdit}
                arranging={arranging&&motionPreview===undefined} motionStep={motionPreview} snap={snap} multiSelect={multiSelect}
                onBatchGeometry={onUpdateGeometries}
                selection={selection} onSelect={setSelection} layerRequest={layerRequest}
                editingBlockId={editingBlockId} onEditText={block=>setEditingBlockId(block.id)}
                onCommitText={(id,value)=>onChangeBlockSource(id,value,'edit')} onCancelText={()=>setEditingBlockId(null)}
                onGeometry={onUpdateGeometry} onGestureStart={onGeometryStart}
                onReset={onResetGeometry}/>}
            </div>
            {activeTemplate&&<TemplateChrome config={activeTemplate} index={page} total={slides.length}/>}
          </div>
          </div>
          <div className="f1-preview-caption"><span>SLIDE {String(page+1).padStart(2,'0')}</span>
            <span>{'Organizado automaticamente · 16:9'}</span></div>
        </div>
        {arranging&&canEdit&&motionPreview===undefined&&layersOpen&&slideModel&&<LayerPanel slide={slideModel} layout={editorLayout} selected={selectedRects} multiSelect={multiSelect}
          onPick={(id,additive)=>setLayerRequest({id,additive})}
          onLayer={(id,direction)=>{
            const r=selectedRects[id]
            if(!r||r.locked)return
            onGeometryStart();onUpdateGeometry(id,{...r,z:Math.max(0,Math.min(100,r.z+direction))})
          }}/>}
        </div>
        {arranging&&canEdit&&slideModel&&<MotionPanel slide={slideModel} motion={editorLayout.motion} block={selectedBlock} locked={Boolean(selectedRect?.locked)}
          onChange={value=>{setMotionPreview(undefined);onMotionChange(value)}} step={motionPreview}
          onPreview={()=>{setPreviewNonce(v=>v+1);setMotionPreview(0)}} onAdvance={()=>setMotionPreview(step=>Math.min((step??0)+1,revealOrder(slideModel.blocks,editorLayout.motion).length))}
          onStop={()=>setMotionPreview(undefined)}/>}
        {arranging&&canEdit&&motionPreview===undefined&&<MultiElementTools rects={selectedRects} onChange={rects=>{
          onGeometryStart();onUpdateGeometries(rects)
        }}/>}
        {arranging&&canEdit&&motionPreview===undefined&&selectedBlock&&selectedRect&&!selectedRect.locked&&<ElementFormatPanel key={selectedBlock.id} block={selectedBlock} rect={selectedRect}
          onEdit={()=>setEditingBlockId(selectedBlock.id)}
          onDuplicate={()=>onChangeBlockSource(selectedBlock.id,'','duplicate',selectedRect)}
          onChange={rect=>{onGeometryStart();onUpdateGeometry(selectedBlock.id,rect)}}/>}
        {arranging&&canEdit&&motionPreview===undefined&&selectedCount===1&&!selectedRect?.locked&&<SlideInspector block={selectedBlock}
          rect={selectedRect||undefined}
          onChange={rect=>{
            if(!selection)return
            onGeometryStart()
            onUpdateGeometry(selection.id,rect)
          }}
          onReset={()=>{
            if(selection){onResetGeometry(selection.id);setSelection(null)}
          }}
          onClear={()=>setSelection(null)}/>}
        {canEdit && <details className="f1-notes-panel">
          <summary>Notas privadas do professor <ChevronRight size={17}/></summary>
          <div className="note-box f1-note-body">
            <label>Slide
              <select value={Math.min(noteIndex, slides.length - 1)} onChange={event => onNoteIndexChange(Number(event.target.value))}>
                {slides.map((_,index) => <option key={index} value={index}>Slide {index+1}</option>)}
              </select>
            </label>
            <textarea value={noteText} onChange={event => onNoteTextChange(event.target.value)} rows={3}
              placeholder="Anotações que só você verá durante a apresentação"/>
            <button className="button secondary" onClick={onSaveNote}><Save size={15}/> Salvar nota</button>
          </div>
        </details>}
      </section>
    </div></> : <article className="article f1-article">
      <span className="eyebrow">APOSTILA DIGITAL</span><h1>{title}</h1>
      <MarkdownView markdown={articleMarkdown(markdown)}/>
    </article>}
  </div>
}
