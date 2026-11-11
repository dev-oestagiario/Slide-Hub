import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { BookOpenText, CheckCircle2, ChevronLeft, ChevronRight, Code2, Columns3, FileText, ImagePlus, List, LayoutTemplate, Mic, Pause, Palette, Play, Plus, Quote, Save, Table2, Upload, Move, Undo2, Redo2 } from 'lucide-react'
import { MarkdownView } from '../../components/MarkdownView'
import { articleMarkdown } from '../../lib/slideParser'
import type { Slide } from '../../lib/slideParser'
import { slideBackgroundStyle, themeForSlide } from '../../lib/slideThemes'
import type { SlideTheme } from '../../lib/slideThemes'
import type { Lesson } from '../courses/types'
import type { PresentationTemplateConfig } from '../templates/model'
import { inferSlideKind, visualThemeForSlide } from '../templates/model'
import { TemplateChrome } from '../templates/TemplateChrome'
import { SlideBlockCanvas } from '../editor/SlideBlockCanvas'
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
  onUpdateGeometry: (id:string, rect:BlockRect)=>void
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
  editorLayout, editorSlides, onUpdateGeometry, onResetGeometry, onGeometryStart,
  onUndoGeometry, onRedoGeometry, canUndoGeometry, canRedoGeometry, isDictating,
  theme, activeTemplate, slides, previewPage, noteIndex, noteText,
  onTitleChange, onMarkdownChange, onModeChange, onAutoBreakChange, onPreviewPageChange,
  onNoteIndexChange, onNoteTextChange, onSave, onPublish, onPresent,
  onOpenThemeStudio, onOpenTemplateLibrary, onSaveNote, onDictate, onImportTemplate, onUploadContentImage, onNotify
}: LessonWorkspaceProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const templateRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [arranging,setArranging] = useState(false)
  useEffect(()=>setArranging(false),[lesson.id])
  const page = Math.min(previewPage, Math.max(0, slides.length - 1))
  const slide = slides[page]
  const slideModel = editorSlides[page]

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

    {mode === 'edit' ? <div className="editor-grid f1-editor-grid">
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

      <section className="preview-card f1-preview-panel" aria-label="Prévia automática dos slides">
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
            onClick={()=>setArranging(value=>!value)}>
            <Move size={16}/> {arranging?'Concluir ajustes':'Organizar visualmente'}
          </button>
          {arranging&&<>
            <button type="button" disabled={!canUndoGeometry} onClick={onUndoGeometry}
              title="Desfazer último ajuste" aria-label="Desfazer posição"><Undo2 size={16}/></button>
            <button type="button" disabled={!canRedoGeometry} onClick={onRedoGeometry}
              title="Refazer último ajuste" aria-label="Refazer posição"><Redo2 size={16}/></button>
          </>}
          <span className="f4-arrange-hint">{arranging?'Arraste ou use as setas do teclado para mover':'Posicionamento opcional'}</span>
        </div>}
        <div className="f1-preview-stage">
          <div className={[
            'mini-slide','f3-lesson-preview','f3-layout-'+slide.layout,
            activeTemplate?'f3-density-'+activeTemplate.density:'',
            activeTemplate?.branding.showHeader?'f3-with-header':'',
            activeTemplate?.footer.text||activeTemplate?.footer.showPageNumber?'f3-with-footer':''
          ].join(' ')} style={slideBackgroundStyle(themeForSlide(
            visualThemeForSlide(activeTemplate,theme,inferSlideKind(slide,page)),slide.theme
          ))}>
            <div className="f3-preview-content f4-preview-shell">
              {slideModel && <SlideBlockCanvas
                slide={slideModel} layout={editorLayout} editable={canEdit}
                arranging={arranging}
                onGeometry={onUpdateGeometry} onGestureStart={onGeometryStart}
                onReset={onResetGeometry}/>}
            </div>
            {activeTemplate&&<TemplateChrome config={activeTemplate} index={page} total={slides.length}/>}
          </div>
          <div className="f1-preview-caption"><span>SLIDE {String(page+1).padStart(2,'0')}</span><span>Gerado do seu texto</span></div>
        </div>
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
    </div> : <article className="article f1-article">
      <span className="eyebrow">APOSTILA DIGITAL</span><h1>{title}</h1>
      <MarkdownView markdown={articleMarkdown(markdown)}/>
    </article>}
  </div>
}
