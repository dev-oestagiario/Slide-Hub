import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, FileText, GraduationCap, Layers, LogOut, Menu, Mic, Plus, Save, Upload, X, Play, Palette, ImagePlus, Code2, Table2, Quote, Columns3 } from 'lucide-react'
import { supabase } from './lib/supabase'
import { parseSlides, articleMarkdown } from './lib/slideParser'
import { hasUnsavedChanges } from './lib/unsavedChanges'
import { MarkdownView } from './components/MarkdownView'
import { Presentation } from './components/Presentation'
import { ThemeStudio } from './components/ThemeStudio'
import { DEFAULT_SLIDE_THEME, normalizeSlideTheme, slideBackgroundStyle, themeForSlide } from './lib/slideThemes'
import type { SlideTheme } from './lib/slideThemes'
import './styles.css'

type Profile = { id: string; full_name: string; role: 'student'|'teacher'|'admin' }
type Discipline = { id: string; owner_id: string; title: string; description: string; is_public: boolean }
type Module = { id: string; discipline_id: string; title: string; description: string; position: number }
type Lesson = { id: string; module_id: string; title: string; markdown: string; status: 'draft'|'published'; position: number; template_id: string|null; theme_config?: unknown; updated_at?: string }
type SlideTemplate = { id: string; owner_id: string; name: string; config: unknown }
type Note = { id?: string; lesson_id: string; slide_index: number; notes: string }
type Theme = { background: string; foreground: string; accent: string; fontFamily?: string }

const example = '# Introdução à Engenharia de Software\n\nO desenvolvimento começa com a compreensão de um problema.\n\n- Identificar necessidades\n- Definir requisitos\n- Modelar uma solução\n\n## O que é UML?\n\nUML é uma linguagem de modelagem visual.\n\n<!-- slide: theme=dark layout=center -->\n\n# Hora de praticar\n\n:::exercise\nDescreva dois requisitos funcionais de uma biblioteca escolar.\n:::\n\n:::answer\n- Consultar livros disponíveis\n- Registrar empréstimos\n:::\n'
function isTheme(value: unknown): value is Theme {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return ['background','foreground','accent'].every(k=>typeof v[k]==='string' && /^#[0-9a-f]{6}$/i.test(v[k] as string)) && (v.fontFamily===undefined || typeof v.fontFamily==='string')
}
export default function App(){
  const [user,setUser]=useState<{id:string;email?:string}|null>(null),[booting,setBooting]=useState(true),[authEmail,setAuthEmail]=useState(''),[authPass,setAuthPass]=useState(''),[signup,setSignup]=useState(false)
  const [profile,setProfile]=useState<Profile|null>(null),[disciplines,setDisciplines]=useState<Discipline[]>([]),[modules,setModules]=useState<Module[]>([]),[lessons,setLessons]=useState<Lesson[]>([]),[templates,setTemplates]=useState<SlideTemplate[]>([])
  const [disciplineId,setDisciplineId]=useState<string|null>(null),[moduleId,setModuleId]=useState<string|null>(null),[lessonId,setLessonId]=useState<string|null>(null)
  const [markdown,setMarkdown]=useState(''),[title,setTitle]=useState(''),[mode,setMode]=useState<'edit'|'article'>('edit'),[presenting,setPresenting]=useState(false)
  const [create,setCreate]=useState<'discipline'|'module'|'lesson'|null>(null),[newTitle,setNewTitle]=useState(''),[newDesc,setNewDesc]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const [themeConfig,setThemeConfig]=useState<SlideTheme>(DEFAULT_SLIDE_THEME),[themeStudioOpen,setThemeStudioOpen]=useState(false),[autoBreak,setAutoBreak]=useState(true),[notes,setNotes]=useState<Note[]>([]),[noteIndex,setNoteIndex]=useState(0),[noteText,setNoteText]=useState(''),[showSidebar,setShowSidebar]=useState(false)
  const [previewPage,setPreviewPage] = useState(0)
  const editor=useRef<HTMLTextAreaElement>(null),upload=useRef<HTMLInputElement>(null),mediaUpload=useRef<HTMLInputElement>(null),recognition=useRef<{stop:()=>void}|null>(null)
  const selectedDiscipline=disciplines.find(d=>d.id===disciplineId),selectedModule=modules.find(m=>m.id===moduleId),lesson=lessons.find(l=>l.id===lessonId)
  const course=disciplines.find(d=>d.id===modules.find(m=>m.id===lesson?.module_id)?.discipline_id)??selectedDiscipline
  const canWrite=profile?.role==='teacher'||profile?.role==='admin',canEdit=Boolean(canWrite && course?.owner_id===user?.id)
  const slides=useMemo(()=>parseSlides(markdown,autoBreak),[markdown,autoBreak])
  const template=templates.find(t=>t.id===lesson?.template_id),colors=themeConfig
  const previewSlide=slides[Math.min(previewPage,slides.length-1)]
  const dirty=hasUnsavedChanges(lesson,{markdown,title})
  useEffect(()=>{if(!supabase){setBooting(false);return}supabase.auth.getUser().then(({data})=>{setUser(data.user);setBooting(false)}).catch(()=>setBooting(false));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user??null));return ()=>subscription.unsubscribe()},[])
  async function refresh(){
    if(!supabase||!user)return
    const [p,d,m,l,t]=await Promise.all([supabase.from('profiles').select('*').eq('id',user.id).maybeSingle(),supabase.from('disciplines').select('*').order('created_at',{ascending:false}),supabase.from('modules').select('*').order('position'),supabase.from('lessons').select('*').order('position'),supabase.from('slide_templates').select('*')])
    const error=[p.error,d.error,m.error,l.error,t.error].filter(Boolean).map(x=>x?.message).join(' / ')
    if(error)setMessage(error)
    setProfile(p.data as Profile|null);setDisciplines((d.data||[]) as Discipline[]);setModules((m.data||[]) as Module[]);setLessons((l.data||[]) as Lesson[]);setTemplates((t.data||[]) as SlideTemplate[])
  }
  useEffect(()=>{if(!user){setProfile(null);setDisciplines([]);setModules([]);setLessons([]);return}void refresh()},[user?.id])
  useEffect(()=>{setMarkdown(lesson?.markdown||'');setTitle(lesson?.title||'');setMode('edit');setNoteIndex(0);setPreviewPage(0)},[lesson?.id])
  useEffect(()=>{const raw=lesson?.theme_config&&typeof lesson.theme_config==='object'&&Object.keys(lesson.theme_config).length?lesson.theme_config:template?.config;setThemeConfig(normalizeSlideTheme(raw))},[lesson?.id,lesson?.theme_config,template?.config])
  useEffect(()=>{if(!lessonId||!canEdit||!supabase){setNotes([]);return}let active=true;supabase.from('speaker_notes').select('*').eq('lesson_id',lessonId).then(({data})=>{if(active)setNotes((data||[]) as Note[])});return ()=>{active=false}},[lessonId,canEdit])
  useEffect(()=>setNoteText(notes.find(n=>n.slide_index===noteIndex)?.notes||''),[notes,noteIndex])
  useEffect(()=>{
    if(!dirty)return
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
    window.addEventListener('beforeunload',warn)
    return ()=>window.removeEventListener('beforeunload',warn)
  },[dirty])
  function confirmDiscard(){
    return !dirty||window.confirm('Existem alterações não salvas nesta aula. Deseja sair e descartá-las?')
  }
  function goHome(){
    if(!confirmDiscard())return
    setDisciplineId(null);setModuleId(null);setLessonId(null);setShowSidebar(false)
  }
  function openDiscipline(id:string){if(!confirmDiscard())return;setDisciplineId(id);setModuleId(null);setLessonId(null);setShowSidebar(false)}
  function openModule(id:string){if(!confirmDiscard())return;setModuleId(id);setDisciplineId(modules.find(m=>m.id===id)?.discipline_id||null);setLessonId(null);setShowSidebar(false)}
  function openLesson(l:Lesson){if(l.id!==lessonId&&!confirmDiscard())return;setLessonId(l.id);setModuleId(l.module_id);setDisciplineId(modules.find(m=>m.id===l.module_id)?.discipline_id||null);setShowSidebar(false)}
  async function handleAuth(e:FormEvent<HTMLFormElement>,signup:boolean){e.preventDefault();if(!supabase)return;setBusy(true);const {error}=signup?await supabase.auth.signUp({email:authEmail,password:authPass,options:{emailRedirectTo:window.location.origin+import.meta.env.BASE_URL}}):await supabase.auth.signInWithPassword({email:authEmail,password:authPass});setMessage(error?.message|| (signup?'Cadastro solicitado. Confirme seu e-mail, se necessário.':''));setBusy(false)}
  async function createEntity(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!supabase||!user||!create||!canWrite||newTitle.trim().length<2)return
    if(!confirmDiscard())return
    setBusy(true);setMessage('');let result:{data:{id:string}|null;error:{message:string}|null}|null=null
    if(create==='discipline')result=await supabase.from('disciplines').insert({owner_id:user.id,title:newTitle.trim(),description:newDesc,is_public:false}).select('id').single()
    if(create==='module'&&selectedDiscipline&&canEdit)result=await supabase.from('modules').insert({discipline_id:selectedDiscipline.id,title:newTitle.trim(),description:newDesc,position:modules.filter(m=>m.discipline_id===selectedDiscipline.id).length}).select('id').single()
    if(create==='lesson'&&selectedModule&&canEdit)result=await supabase.from('lessons').insert({module_id:selectedModule.id,title:newTitle.trim(),markdown:example,position:lessons.filter(l=>l.module_id===selectedModule.id).length}).select('id').single()
    if(result?.error)setMessage(result.error.message)
    else if(result?.data){if(create==='discipline'){setDisciplineId(result.data.id);setModuleId(null);setLessonId(null)}if(create==='module'){setModuleId(result.data.id);setLessonId(null)}if(create==='lesson')setLessonId(result.data.id);setCreate(null);await refresh()}
    setBusy(false)
  }
  async function save(){if(!supabase||!lesson||!canEdit)return;setBusy(true);const {error}=await supabase.from('lessons').update({title:title.trim(),markdown}).eq('id',lesson.id);setMessage(error?.message||'Aula salva.');await refresh();setBusy(false)}
  async function publish(){if(!supabase||!lesson||!canEdit)return;const status=lesson.status==='published'?'draft':'published';const {error}=await supabase.from('lessons').update({title:title.trim(),markdown,status}).eq('id',lesson.id);setMessage(error?.message||'Publicação atualizada.');await refresh()}
  async function share(){if(!supabase||!selectedDiscipline||!canEdit)return;const {error}=await supabase.from('disciplines').update({is_public:!selectedDiscipline.is_public}).eq('id',selectedDiscipline.id);if(error)setMessage(error.message);else await refresh()}
  async function saveNote(){if(!supabase||!lesson||!canEdit)return;const {error}=await supabase.from('speaker_notes').upsert({lesson_id:lesson.id,slide_index:noteIndex,notes:noteText},{onConflict:'lesson_id,slide_index'});setMessage(error?.message||'Nota salva.');if(!error)setNotes(v=>[...v.filter(n=>n.slide_index!==noteIndex),{lesson_id:lesson.id,slide_index:noteIndex,notes:noteText}])}
  async function importTemplate(file:File){if(!supabase||!user||!canWrite)return;try{if(file.size>100000)throw Error('Arquivo muito grande (máximo 100 KB).');const raw=JSON.parse(await file.text()) as Record<string,unknown>;const config=raw.config||raw;if(!isTheme(config))throw Error('JSON inválido. Use cores hex em background, foreground e accent.');const name=String(raw.name||file.name.replace(/\.json$/i,''));const {error}=await supabase.from('slide_templates').insert({owner_id:user.id,name:name.slice(0,100),config:normalizeSlideTheme(config)});if(error)throw error;await refresh();setMessage('Template importado.')}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível importar.')}} 
  async function applyGlobalTheme(next:SlideTheme):Promise<boolean>{
    if(!supabase||!lesson||!canEdit)return false
    const config=normalizeSlideTheme(next)
    const {data,error}=await supabase.from('lessons').update({theme_config:config,template_id:null})
      .eq('id',lesson.id).select('id').single()
    if(error||!data){setMessage(error?.message||'Erro ao aplicar tema.');return false}
    setLessons(list=>list.map(item=>item.id===lesson.id?{...item,theme_config:config,template_id:null}:item))
    setThemeConfig(config);setMessage('Tema aplicado em toda a apresentação.')
    return true
  }
  async function saveThemePreset(name:string,next:SlideTheme):Promise<boolean>{
    if(!supabase||!user||!canEdit)return false
    const {data,error}=await supabase.from('slide_templates')
      .insert({owner_id:user.id,name,config:normalizeSlideTheme(next)}).select('*').single()
    if(error||!data){setMessage(error?.message||'Não foi possível guardar o tema.');return false}
    setTemplates(previous=>[...previous,data as SlideTemplate]);return true
  }
  async function uploadBackground(file:File):Promise<string>{
    if(!supabase||!user||!canEdit)throw Error('Apenas professores podem enviar imagens.')
    const ext:Record<string,string>={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}
    if(!ext[file.type]||file.size===0||file.size>3*1024*1024)
      throw Error('Use JPG, PNG ou WebP com até 3 MB.')
    const key=user.id+'/'+crypto.randomUUID()+'.'+ext[file.type]
    const {error}=await supabase.storage.from('slide-theme-backgrounds').upload(key,file,{contentType:file.type,upsert:false,cacheControl:'3600'})
    if(error)throw Error(error.message)
    return supabase.storage.from('slide-theme-backgrounds').getPublicUrl(key).data.publicUrl
  }
  async function insertContentImage(file:File){
    try{const url=await uploadBackground(file);insert('\n![Imagem do slide]('+url+')\n');setMessage('Imagem inserida no slide.')}
    catch(e){setMessage(e instanceof Error?e.message:'Não foi possível enviar a imagem.')}
  }
  function insert(snippet:string){if(!canEdit)return;const el=editor.current,a=el?.selectionStart??markdown.length,b=el?.selectionEnd??markdown.length;setMarkdown(markdown.slice(0,a)+snippet+markdown.slice(b));requestAnimationFrame(()=>{el?.focus();el?.setSelectionRange(a+snippet.length,a+snippet.length)})}
  function dictate(){
    const browser=window as Window & {SpeechRecognition?:new()=>any;webkitSpeechRecognition?:new()=>any}
    const C=browser.SpeechRecognition||browser.webkitSpeechRecognition
    if(!C){setMessage('Ditado não disponível neste navegador.');return}
    if(recognition.current){recognition.current.stop();recognition.current=null;return}
    const r=new C();r.lang='pt-BR';r.continuous=true;r.interimResults=false
    r.onresult=(e:any)=>{let text='';for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)text+=e.results[i][0].transcript+' ';if(text)setMarkdown(v=>v+text)}
    r.onend=()=>{recognition.current=null};r.onerror=()=>setMessage('Não foi possível usar o microfone. Verifique a permissão.');recognition.current=r;r.start()
  }
  function startPresentation(){
    setPresenting(true)
    if(!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(()=>undefined)
  }
  function closePresentation(){
    setPresenting(false)
    if(document.fullscreenElement) void document.exitFullscreen().catch(()=>undefined)
  }
  if(booting)return <div className="centered">Carregando SlideHub…</div>
  if(!supabase)return <div className="centered"><div className="auth-panel"><h1>Configuração necessária</h1><p>Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo .env.</p></div></div>
  if(!user)return <div className="centered"><div className="auth-panel"><span className="brand-icon"><GraduationCap/></span><h1>SlideHub</h1><p>Da aula escrita à apresentação.</p><form onSubmit={e=>void handleAuth(e,signup)}><label>E-mail<input type="email" required value={authEmail} onChange={e=>setAuthEmail(e.target.value)} /></label><label>Senha<input type="password" minLength={6} required value={authPass} onChange={e=>setAuthPass(e.target.value)}/></label><button className="button primary" disabled={busy}>{signup?'Criar conta':'Entrar'}</button><button className="button subtle" type="button" onClick={()=>setSignup(v=>!v)}>{signup?'Já tenho conta':'Criar conta'}</button></form>{message&&<p role="status">{message}</p>}</div></div>
  return <div className="shell">
    <aside className={'sidebar '+(showSidebar?'open':'')}>
      <div className="brand"><span className="brand-icon"><GraduationCap/></span><div><strong>SlideHub</strong><small>Estúdio educacional</small></div><button className="icon-button mobile-only" onClick={()=>setShowSidebar(false)}><X/></button></div>
      <button className="nav-home" onClick={goHome}><BookOpen size={18}/> Visão geral</button>
      <div className="side-label">DISCIPLINAS {canWrite&&<button onClick={()=>setCreate('discipline')} aria-label="Adicionar disciplina"><Plus size={16}/></button>}</div>
      <div className="side-scroll">{disciplines.map(d=><div key={d.id}><button className={'side-item '+(disciplineId===d.id?'active':'')} onClick={()=>openDiscipline(d.id)}><GraduationCap size={17}/><span>{d.title}</span></button>{disciplineId===d.id&&modules.filter(m=>m.discipline_id===d.id).map(m=><div className="side-nested" key={m.id}><button className={'side-item '+(moduleId===m.id?'active':'')} onClick={()=>openModule(m.id)}><Layers size={16}/>{m.title}</button>{moduleId===m.id&&lessons.filter(l=>l.module_id===m.id).map(l=><button className={'side-item side-lesson '+(lessonId===l.id?'active':'')} onClick={()=>openLesson(l)} key={l.id}><FileText size={15}/>{l.title}</button>)}</div>)}</div>)}</div>
      <div className="sidebar-foot"><span>{profile?.full_name||user.email||'Conta'}</span><small>{profile?.role==='teacher'?'Professor':profile?.role==='admin'?'Administrador':'Aluno'}</small><button className="icon-button" onClick={()=>{if(confirmDiscard())void supabase?.auth.signOut()}} aria-label="Sair"><LogOut size={18}/></button></div>
    </aside>
    <div className="main-area"><header className="topbar"><button className="icon-button mobile-only" aria-label="Abrir menu" onClick={()=>setShowSidebar(true)}><Menu/></button><div className="crumb"><span onClick={goHome}>Início</span>{selectedDiscipline&&<><ChevronRight size={15}/><span onClick={()=>openDiscipline(selectedDiscipline.id)}>{selectedDiscipline.title}</span></>}{selectedModule&&<><ChevronRight size={15}/><span onClick={()=>openModule(selectedModule.id)}>{selectedModule.title}</span></>}{lesson&&<><ChevronRight size={15}/><strong>{lesson.title}</strong></>}</div><span className="top-tag">Markdown → Slides</span></header>
      <main className="workspace">
        {message&&<div className="notice" role="status">{message}<button aria-label="Fechar aviso" onClick={()=>setMessage('')}><X size={15}/></button></div>}
        {lesson?<><div className="titlebar"><div><span className="eyebrow">EDITOR DE AULAS</span><input className="lesson-heading" value={title} disabled={!canEdit} onChange={e=>setTitle(e.target.value)} aria-label="Título da aula"/><p>{slides.length} slides · {lesson.status==='published'?'Publicada':'Rascunho'} {dirty?'· Alterações não salvas':''}</p></div><div className="actions">{canEdit&&<button className="button subtle" onClick={()=>void publish()}>{lesson.status==='published'?'Despublicar':'Publicar'}</button>}{canEdit&&<button className="button secondary" onClick={()=>void save()} disabled={!dirty||busy}><Save size={17}/> Salvar</button>}<button className="button primary" onClick={startPresentation} title="Apresentar os slides gerados do Markdown atual"><Play size={17}/> Modo apresentação</button></div></div>
          <div className="toolbar"><div className="tabs"><button className={mode==='edit'?'selected':''} onClick={()=>setMode('edit')}>Markdown</button><button className={mode==='article'?'selected':''} onClick={()=>setMode('article')}>Apostila</button></div><label className="check"><input type="checkbox" checked={autoBreak} onChange={e=>setAutoBreak(e.target.checked)}/> H2 = slide</label>{canEdit&&<><button className="button theme-launch" onClick={()=>setThemeStudioOpen(true)}><Palette size={17}/> Personalizar slides</button><div className="active-theme-indicator"><span style={{background:colors.background,borderColor:colors.accent}}/>Tema da aula</div></>}{canEdit&&<details className="advanced-template"><summary>Avançado</summary><div><button className="button subtle" onClick={()=>upload.current?.click()}><Upload size={15}/> Importar JSON</button><input ref={upload} type="file" accept=".json,application/json" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void importTemplate(f);e.target.value=''}}/></div></details>}</div>
          {mode==='edit'?<div className="editor-grid"><section className="editor-card"><div className="panel-title"><h2>Conteúdo da aula</h2><span>Markdown</span></div>{canEdit&&<div className="format-bar"><button onClick={()=>insert('\n## Novo slide\n')}>H2</button><button onClick={()=>insert('\n<!-- slide -->\n')}>+ Slide</button><button onClick={()=>insert('\n<!-- slide: layout=center -->\n')}>Centralizar</button><button onClick={()=>insert('\n<!-- slide: layout=split -->\n')}><Columns3 size={14}/> 2 colunas</button><button onClick={()=>insert('\n:::exercise\nSua pergunta\n:::\n\n:::answer\nSolução\n:::\n')}>Exercício</button><button onClick={()=>insert('\n> Conceito importante\n')}><Quote size={14}/> Citação</button><button onClick={()=>insert('\n| Conceito | Descrição |\n| --- | --- |\n| Exemplo | Explicação |\n')}><Table2 size={14}/> Tabela</button><button onClick={()=>mediaUpload.current?.click()}><ImagePlus size={14}/> Imagem</button><input ref={mediaUpload} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void insertContentImage(f);e.target.value=''}}/><button onClick={()=>insert('\n'+String.fromCharCode(96).repeat(3)+'javascript\n// Exemplo\n'+String.fromCharCode(96).repeat(3)+'\n')}><Code2 size={14}/> Código</button><button onClick={()=>insert('\n'+String.fromCharCode(96).repeat(3)+'mermaid\nflowchart LR\n A --> B\n'+String.fromCharCode(96).repeat(3)+'\n')}>Mermaid</button><button onClick={dictate}><Mic size={15}/> Ditar</button></div>}<textarea ref={editor} className="code-editor" spellCheck={false} value={markdown} onChange={e=>setMarkdown(e.target.value)} readOnly={!canEdit} aria-label="Editor Markdown"/><div className="editor-footer">{markdown.length.toLocaleString('pt-BR')} caracteres · salve suas alterações manualmente</div></section><section className="preview-card"><div className="panel-title"><h2>Prévia do slide</h2><div className="preview-pagination"><button type="button" aria-label="Slide anterior da prévia" disabled={previewPage===0} onClick={()=>setPreviewPage(i=>Math.max(0,i-1))}><ChevronLeft size={16}/></button><span>{Math.min(previewPage+1,slides.length)} / {slides.length}</span><button type="button" aria-label="Próximo slide da prévia" disabled={previewPage>=slides.length-1} onClick={()=>setPreviewPage(i=>Math.min(slides.length-1,i+1))}><ChevronRight size={16}/></button></div></div><div className="mini-slide" style={slideBackgroundStyle(themeForSlide(colors,previewSlide.theme))}><MarkdownView markdown={previewSlide.markdown}/></div>{canEdit&&<div className="note-box"><h3>Notas privadas do professor</h3><label>Slide <select value={noteIndex} onChange={e=>setNoteIndex(Number(e.target.value))}>{slides.map((_,i)=><option key={i} value={i}>Slide {i+1}</option>)}</select></label><textarea value={noteText} onChange={e=>setNoteText(e.target.value)} rows={3} placeholder="Anotações do orador"/><button className="button secondary" onClick={()=>void saveNote()}><Save size={15}/> Salvar notas</button></div>}</section></div>:<article className="article"><div className="eyebrow">APOSTILA DIGITAL</div><h1>{title}</h1><MarkdownView markdown={articleMarkdown(markdown)}/></article>}
        </>:selectedModule?<><div className="titlebar"><div><span className="eyebrow">MÓDULO</span><h1>{selectedModule.title}</h1><p>{selectedModule.description||'Aulas organizadas em sequência'}</p></div>{canEdit&&<button className="button primary" onClick={()=>setCreate('lesson')}><Plus size={17}/> Nova aula</button>}</div><div className="list">{lessons.filter(l=>l.module_id===moduleId).map((l,i)=><button key={l.id} className="list-item" onClick={()=>openLesson(l)}><span className="number">{String(i+1).padStart(2,'0')}</span><div><strong>{l.title}</strong><small>{l.status==='published'?'Publicada':'Rascunho'}</small></div><ChevronRight/></button>)}</div></>:selectedDiscipline?<><div className="titlebar"><div><span className="eyebrow">DISCIPLINA</span><h1>{selectedDiscipline.title}</h1><p>{selectedDiscipline.description||'Organize aulas em módulos.'}</p></div>{canEdit&&<button className="button primary" onClick={()=>setCreate('module')}><Plus size={17}/> Novo módulo</button>}</div>{canEdit&&<div className="share"><p>{selectedDiscipline.is_public?'Disciplina visível para alunos autenticados.':'Disciplina privada.'}</p><button className="button secondary" onClick={()=>void share()}>{selectedDiscipline.is_public?'Tornar privada':'Disponibilizar aos alunos'}</button></div>}<div className="card-grid">{modules.filter(m=>m.discipline_id===disciplineId).map((m,i)=><button className="course-card" key={m.id} onClick={()=>openModule(m.id)}><Layers size={24}/><span>MÓDULO {String(i+1).padStart(2,'0')}</span><h3>{m.title}</h3><p>{m.description||'Veja as aulas deste módulo'}</p><small>{lessons.filter(l=>l.module_id===m.id).length} aulas <ChevronRight size={15}/></small></button>)}</div></>:<><div className="hero"><span className="eyebrow">SEU ESPAÇO DE ENSINO</span><h1>Transforme conteúdo em experiências.</h1><p>Escreva sua aula, escolha o plano de fundo e apresente com um clique — sem precisar mexer em JSON.</p>{canWrite&&<button className="button light-button" onClick={()=>setCreate('discipline')}><Plus/> Criar disciplina</button>}</div><div className="section-heading"><h2>Disciplinas disponíveis</h2><span>{disciplines.length}</span></div><div className="card-grid">{disciplines.map(d=><button className="course-card" key={d.id} onClick={()=>openDiscipline(d.id)}><GraduationCap size={25}/><h3>{d.title}</h3><p>{d.description||'Conteúdo organizado em aulas e módulos'}</p><small>{modules.filter(m=>m.discipline_id===d.id).length} módulos <ChevronRight size={15}/></small></button>)}</div>{!disciplines.length&&<div className="empty">Nenhuma disciplina disponível. {canWrite?'Crie sua primeira disciplina para começar.':'Aguarde a publicação do professor.'}</div>}</>}
      </main>
    </div>
    {themeStudioOpen&&lesson&&canEdit&&<ThemeStudio initial={colors} previewMarkdown={previewSlide.markdown} savedThemes={templates} onClose={()=>setThemeStudioOpen(false)} onApply={applyGlobalTheme} onSavePreset={saveThemePreset} onUploadImage={uploadBackground}/>} 
    {presenting&&lesson&&<Presentation slides={slides} title={title} theme={colors} notes={notes} canEdit={canEdit} onClose={closePresentation}/>}
    {create&&<div className="modal-backdrop"><form className="modal" onSubmit={e=>void createEntity(e)}><div className="modal-top"><h2>{create==='discipline'?'Nova disciplina':create==='module'?'Novo módulo':'Nova aula'}</h2><button type="button" className="icon-button" onClick={()=>setCreate(null)} aria-label="Fechar"><X/></button></div><label>Título<input minLength={2} maxLength={180} required autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Digite um título"/></label>{create!=='lesson'&&<label>Descrição<textarea value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="Descrição opcional"/></label>}<div className="modal-actions"><button type="button" className="button subtle" onClick={()=>setCreate(null)}>Cancelar</button><button className="button primary" disabled={busy||newTitle.trim().length<2}>Criar <ChevronRight size={17}/></button></div></form></div>}
  </div>
}
