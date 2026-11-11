import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Check, CheckCircle2, Copy, FileText, ImagePlus, LayoutTemplate, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { MarkdownView } from '../../components/MarkdownView'
import { FONT_OPTIONS, normalizeSlideTheme, slideBackgroundStyle, THEME_PRESETS } from '../../lib/slideThemes'
import type { SlideTheme } from '../../lib/slideThemes'
import type { SlideLayout } from '../../lib/slideParser'
import type { Lesson } from '../courses/types'
import {
  BUILTIN_PRESENTATION_TEMPLATES, normalizePresentationTemplate,
  personalTemplate, templateChoices
} from './model'
import type { PresentationTemplateRecord, PresentationTemplateConfig, TemplateChoice } from './model'

type TemplateDraft = {
  name: string
  description: string
  config: PresentationTemplateConfig
}
type Props = {
  records: PresentationTemplateRecord[]
  lessons: Lesson[]
  currentLesson?: Lesson | null
  canWrite: boolean
  previewMarkdown?: string
  onClose?: () => void
  onCreate: (name: string, description: string, config: PresentationTemplateConfig) => Promise<PresentationTemplateRecord | null>
  onUpdate: (id: string, revision: number, name: string, description: string, config: PresentationTemplateConfig) => Promise<PresentationTemplateRecord | null>
  onDuplicate: (template: TemplateChoice) => Promise<PresentationTemplateRecord | null>
  onDelete: (record: PresentationTemplateRecord) => Promise<boolean>
  onApply: (template: TemplateChoice, lessonId: string) => Promise<boolean>
  onUploadImage: (file: File) => Promise<string>
  onNotify: (message: string) => void
}

const sampleMarkdown = '# Introdução ao conteúdo\n\nUma aula clara começa com uma boa ideia.\n\n- Primeiro conceito\n- Exemplo prático\n- Resumo'
const layoutOptions: { value: SlideLayout; label: string }[] = [
  { value:'default', label:'Texto organizado' },
  { value:'center', label:'Centralizado' },
  { value:'split', label:'Duas colunas' }
]
const validColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value)
function draftFromChoice(template: TemplateChoice): TemplateDraft {
  return { name:template.name, description:template.description,
    config:normalizePresentationTemplate(template.config) }
}
function NameField({label,value,onChange}: {label:string; value:string; onChange:(next:string)=>void}) {
  return <label className="f2-color-field"><span>{label}</span><div>
    <input type="color" value={validColor(value)?value:'#FFFFFF'} aria-label={label}
      onChange={event=>onChange(event.target.value.toUpperCase())}/>
    <code>{value}</code>
  </div></label>
}
export function TemplateLibrary({
  records,lessons,currentLesson,canWrite,previewMarkdown,onClose,onCreate,onUpdate,
  onDuplicate,onDelete,onApply,onUploadImage,onNotify
}:Props) {
  const [search,setSearch]=useState('')
  const [filter,setFilter]=useState<'all'|'builtin'|'personal'>('all')
  const [selectedId,setSelectedId]=useState<string>(currentLesson?.presentation_template_id || 'system:ice')
  const [editing,setEditing]=useState<'create'|'update'|null>(null)
  const [editId,setEditId]=useState('')
  const [draft,setDraft]=useState<TemplateDraft>(()=>draftFromChoice(BUILTIN_PRESENTATION_TEMPLATES[0]))
  const [busy,setBusy]=useState(false)
  const [imageBusy,setImageBusy]=useState(false)
  const [targetLessonId,setTargetLessonId]=useState(currentLesson?.id || '')
  const choices=useMemo(()=>templateChoices(records),[records])
  const selected=choices.find(t=>t.id===selectedId)??choices[0]
  const ownedLessons=lessons
  const source=previewMarkdown || currentLesson?.markdown || sampleMarkdown
  const personal=selected?.kind==='personal' ? records.find(r=>r.id===selected.id) : undefined
  const items=choices.filter(choice=>
    (filter==='all'||choice.kind===filter)
    && (choice.name+' '+choice.description).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  const showing=editing?draft.config:selected.config

  function beginCreate(choice=selected) {
    setDraft({...draftFromChoice(choice),name:choice.kind==='builtin'?choice.name+' personalizado':'Novo template'})
    setEditId('')
    setEditing('create')
  }
  function beginUpdate() {
    if(!personal)return
    setDraft(draftFromChoice(personalTemplate(personal)))
    setEditId(personal.id)
    setEditing('update')
  }
  function changeTheme(patch:Partial<SlideTheme>) {
    setDraft(v=>({...v,config:{...v.config,theme:normalizeSlideTheme({...v.config.theme,...patch})}}))
  }
  function setLayout(key:'cover'|'content'|'exercise',value:SlideLayout) {
    setDraft(v=>({...v,config:{...v.config,layouts:{...v.config.layouts,[key]:value}}}))
  }
  function setFooter(patch:Partial<PresentationTemplateConfig['footer']>) {
    setDraft(v=>({...v,config:{...v.config,footer:{...v.config.footer,...patch}}}))
  }
  async function save(event:FormEvent) {
    event.preventDefault()
    if(!canWrite||busy)return
    const name=draft.name.trim()
    if(name.length<2||name.length>100){onNotify('O nome deve ter entre 2 e 100 caracteres.');return}
    if(draft.description.length>320){onNotify('Descrição muito longa.');return}
    setBusy(true)
    try{
      let result:PresentationTemplateRecord|null=null
      if(editing==='update') {
        const current=records.find(record=>record.id===editId)
        if(current)result=await onUpdate(editId,current.revision,name,draft.description,draft.config)
      } else result=await onCreate(name,draft.description,draft.config)
      if(result){setSelectedId(result.id);setEditing(null)}
    }finally{setBusy(false)}
  }
  async function duplicate() {
    if(!canWrite||busy)return
    setBusy(true)
    try{const result=await onDuplicate(selected);if(result)setSelectedId(result.id)}
    finally{setBusy(false)}
  }
  async function remove() {
    if(!personal||busy||!canWrite)return
    if(!window.confirm('Excluir o template "'+personal.name+'"? As aulas que já o utilizaram manterão o visual salvo.'))return
    setBusy(true)
    try{if(await onDelete(personal)){setSelectedId('system:ice');setEditing(null)}}
    finally{setBusy(false)}
  }
  async function apply() {
    if(!targetLessonId||!canWrite||busy)return
    setBusy(true)
    try{await onApply(selected,targetLessonId)}
    finally{setBusy(false)}
  }
  async function uploadBackground(file:File) {
    if(!canWrite)return
    setImageBusy(true)
    try{
      const url=await onUploadImage(file)
      changeTheme({backgroundMode:'image',backgroundImage:url,foreground:'#FFFFFF'})
    }catch(error){onNotify(error instanceof Error?error.message:'Não foi possível enviar a imagem.')}
    finally{setImageBusy(false)}
  }

  return <section className="f2-library" aria-labelledby="f2-library-title">
    <header className="f2-header">
      <div>
        <span className="eyebrow">BIBLIOTECA DE APRESENTAÇÕES</span>
        <h1 id="f2-library-title">Templates</h1>
        <p>Escolha uma identidade para sua aula. O SlideHub organiza o texto automaticamente.</p>
      </div>
      <div className="f2-header-actions">
        {canWrite&&<button className="button primary" onClick={()=>beginCreate()}><Plus size={17}/> Criar template</button>}
        {onClose&&<button className="f2-close" onClick={onClose} aria-label="Fechar biblioteca"><X size={20}/></button>}
      </div>
    </header>

    {editing ? <div className="f2-editor">
      <header className="f2-subheading">
        <button className="f2-back" onClick={()=>setEditing(null)}><ArrowLeft size={17}/> Biblioteca</button>
        <h2>{editing==='create'?'Criar template':'Editar template'}</h2>
        <p>Defina a aparência e como cada tipo de conteúdo será distribuído. Sem escrever JSON.</p>
      </header>
      <div className="f2-editor-grid">
        <form className="f2-edit-controls" id="f2-template-form" onSubmit={event=>void save(event)}>
          <label>Nome do template
            <input required minLength={2} maxLength={100} value={draft.name}
              onChange={event=>setDraft(v=>({...v,name:event.target.value}))} placeholder="Ex.: Tecnologia institucional"/>
          </label>
          <label>Descrição
            <textarea maxLength={320} rows={2} value={draft.description}
              onChange={event=>setDraft(v=>({...v,description:event.target.value}))}
              placeholder="Quando usar este modelo?"/>
          </label>
          <h3>Escolha um ponto de partida</h3>
          <div className="f2-preset-swatches" role="group" aria-label="Paletas de cores">
            {THEME_PRESETS.map(preset=><button type="button" key={preset.id}
              title={preset.name} aria-label={preset.name} style={slideBackgroundStyle(preset.theme)}
              onClick={()=>changeTheme(preset.theme)}><span>Aa</span></button>)}
          </div>
          <h3>Plano de fundo e tipografia</h3>
          <div className="f2-color-grid">
            <NameField label="Fundo" value={draft.config.theme.background} onChange={value=>changeTheme({background:value,backgroundMode:'solid'})}/>
            <NameField label="Texto" value={draft.config.theme.foreground} onChange={value=>changeTheme({foreground:value})}/>
            <NameField label="Destaque" value={draft.config.theme.accent} onChange={value=>changeTheme({accent:value})}/>
          </div>
          <div className="f2-background-modes">
            <label>Tipo de fundo
              <select value={draft.config.theme.backgroundMode} onChange={event=>{
                const mode=event.target.value as SlideTheme['backgroundMode']
                changeTheme({backgroundMode:mode==='image'&&!draft.config.theme.backgroundImage?'solid':mode})
              }}>
                <option value="solid">Cor sólida</option><option value="gradient">Degradê</option>
                {draft.config.theme.backgroundImage&&<option value="image">Imagem</option>}
              </select>
            </label>
            <label className="f2-image-upload"><ImagePlus size={16}/> {imageBusy?'Enviando...':'Escolher imagem'}
              <input disabled={imageBusy} type="file" accept="image/png,image/jpeg,image/webp"
                onChange={event=>{const file=event.target.files?.[0];if(file)void uploadBackground(file);event.target.value=''}}/>
            </label>
          </div>
          <label>Fonte
            <select value={draft.config.theme.fontFamily} onChange={event=>changeTheme({fontFamily:event.target.value})}>
              {FONT_OPTIONS.map(font=><option value={font.value} key={font.value}>{font.label}</option>)}
            </select>
          </label>
          <h3>Organização automática</h3>
          {([
            ['cover','Slide de abertura'],
            ['content','Slides de conteúdo'],
            ['exercise','Slides de exercício']
          ] as const).map(([key,label])=><label key={key}>{label}
            <select value={draft.config.layouts[key]} onChange={event=>setLayout(key,event.target.value as SlideLayout)}>
              {layoutOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>)}
          <h3>Rodapé dos slides</h3>
          <label>Texto do rodapé
            <input maxLength={80} value={draft.config.footer.text}
              onChange={event=>setFooter({text:event.target.value})} placeholder="Ex.: Escola / Curso"/>
          </label>
          <label className="f2-checkbox"><input type="checkbox" checked={draft.config.footer.showPageNumber}
            onChange={event=>setFooter({showPageNumber:event.target.checked})}/> Mostrar numeração no slide</label>
          <div className="f2-editor-actions">
            <button className="button secondary" type="button" onClick={()=>setEditing(null)}>Cancelar</button>
            <button className="button primary" disabled={busy||imageBusy||!draft.name.trim()} type="submit">
              <Check size={17}/> {busy?'Salvando...':'Salvar template'}
            </button>
          </div>
        </form>
        <div className="f2-editor-preview">
          <h3>Prévia do template</h3>
          <TemplatePreview config={showing} markdown={source}/>
          <p>O mesmo visual será aplicado aos slides gerados a partir do seu texto.</p>
        </div>
      </div>
    </div> : <div className="f2-browser">
      <div className="f2-filterbar">
        <div className="f2-tabs" role="group" aria-label="Tipo de template">
          <button aria-pressed={filter==='all'} className={filter==='all'?'selected':''} onClick={()=>setFilter('all')}>Todos</button>
          <button aria-pressed={filter==='builtin'} className={filter==='builtin'?'selected':''} onClick={()=>setFilter('builtin')}>Modelos prontos</button>
          <button aria-pressed={filter==='personal'} className={filter==='personal'?'selected':''} onClick={()=>setFilter('personal')}>Meus templates</button>
        </div>
        <label className="f2-search"><Search size={17}/>
          <input aria-label="Buscar templates" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar template"/>
        </label>
      </div>
      <div className="f2-browser-grid">
        <div className="f2-catalog">
          {items.map(choice=><button type="button" key={choice.id} className={'f2-tile '+(selected.id===choice.id?'selected':'')}
            aria-pressed={selected.id===choice.id} onClick={()=>setSelectedId(choice.id)}>
            <div className="f2-tile-preview" style={slideBackgroundStyle(choice.config.theme)}>
              <span className="f2-tile-kicker" style={{color:choice.config.theme.accent}}>SLIDEHUB</span>
              <strong>O começo de uma boa aula.</strong>
              <span className="f2-tile-line"/>
            </div>
            <div className="f2-tile-info"><strong>{choice.name}</strong><small>{choice.kind==='personal'?'Meu template':'Modelo pronto'}</small></div>
          </button>)}
          {!items.length&&<div className="f2-empty"><LayoutTemplate size={25}/><h3>Nenhum template encontrado</h3>
            <p>Experimente pesquisar outro nome ou criar um modelo próprio.</p></div>}
        </div>
        <aside className="f2-detail">
          <span className="f2-detail-kicker">{selected.kind==='personal'?'MEU TEMPLATE':'MODELO PRONTO'}</span>
          <h2>{selected.name}</h2>
          <p>{selected.description||'Uma apresentação com identidade visual consistente.'}</p>
          <TemplatePreview config={showing} markdown={source}/>
          <div className="f2-detail-meta"><CheckCircle2 size={17}/> Aplica o mesmo visual a todos os slides.</div>
          {canWrite&&<div className="f2-apply">
            <label>Aplicar na aula
              <select value={targetLessonId} onChange={event=>setTargetLessonId(event.target.value)}>
                <option value="">Escolha uma aula</option>
                {ownedLessons.map(lesson=><option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
              </select>
            </label>
            <button className="button primary" disabled={!targetLessonId||busy} onClick={()=>void apply()}>
              <Check size={16}/> {busy?'Aplicando...':'Aplicar template'}
            </button>
          </div>}
          {canWrite&&<div className="f2-detail-actions">
            <button onClick={()=>void duplicate()} disabled={busy}><Copy size={16}/> Duplicar</button>
            <button onClick={()=>beginCreate()} disabled={busy}><Plus size={16}/> Criar parecido</button>
            {personal&&<button onClick={beginUpdate} disabled={busy}><Pencil size={16}/> Editar</button>}
            {personal&&<button className="f2-delete" onClick={()=>void remove()} disabled={busy}><Trash2 size={16}/> Excluir</button>}
          </div>}
          <p className="f2-snapshot-hint">Editar ou excluir o modelo original não muda as aulas que já receberam esse template.</p>
        </aside>
      </div>
    </div>}
  </section>
}

function TemplatePreview({config,markdown}:{config:PresentationTemplateConfig;markdown:string}) {
  const parsed=markdown.trim().split(/\n##\s+/)
  const preview=parsed[0]||sampleMarkdown
  const chosenLayout=config.layouts.cover
  return <div className="f2-preview-wrap">
    <div className={'f2-preview-slide f2-layout-'+chosenLayout} style={slideBackgroundStyle(config.theme)}>
      <span className="f2-preview-kicker" style={{color:config.theme.accent}}>SLIDEHUB / AULA</span>
      <div className="f2-preview-content"><MarkdownView markdown={preview}/></div>
      <div className="f2-preview-footer">
        <span>{config.footer.text}</span>{config.footer.showPageNumber&&<span>01 / 03</span>}
      </div>
    </div>
  </div>
}
