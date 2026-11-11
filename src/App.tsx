import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronRight, GraduationCap, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import { parseSlides } from './lib/slideParser'
import { hasUnsavedChanges } from './lib/unsavedChanges'
import { Presentation } from './components/Presentation'
import { ThemeStudio } from './components/ThemeStudio'
import { DEFAULT_SLIDE_THEME, normalizeSlideTheme } from './lib/slideThemes'
import type { SlideTheme } from './lib/slideThemes'
import { AppSidebar } from './features/navigation/AppSidebar'
import { AppTopbar } from './features/navigation/AppTopbar'
import { Dashboard } from './features/dashboard/Dashboard'
import { CourseOverview } from './features/courses/CourseOverview'
import { LessonWorkspace } from './features/lessons/LessonWorkspace'
import type { Profile, Discipline, CourseModule as Module, Lesson, SlideTemplate, SpeakerNote as Note } from './features/courses/types'

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
  const [dictating,setDictating] = useState(false)
  const recognition=useRef<{stop:()=>void}|null>(null)
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
  function dictate(){
    const browser=window as Window & {SpeechRecognition?:new()=>any;webkitSpeechRecognition?:new()=>any}
    const C=browser.SpeechRecognition||browser.webkitSpeechRecognition
    if(!C){setMessage('Ditado não disponível neste navegador.');return}
    if(recognition.current){recognition.current.stop();recognition.current=null;setDictating(false);return}
    const r=new C();r.lang='pt-BR';r.continuous=true;r.interimResults=false
    r.onresult=(e:any)=>{let text='';for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)text+=e.results[i][0].transcript+' ';if(text)setMarkdown(v=>v+text)}
    r.onend=()=>{recognition.current=null;setDictating(false)}
    r.onerror=()=>{setDictating(false);setMessage('Não foi possível usar o microfone. Verifique a permissão.')}
    recognition.current=r
    try{r.start();setDictating(true)}
    catch{recognition.current=null;setDictating(false);setMessage('Não foi possível iniciar o ditado.')}
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
  function showCreate(kind:'discipline'|'module'|'lesson'){
    setNewTitle('')
    setNewDesc('')
    setCreate(kind)
  }
  return <div className="shell f1-shell">
    <a href="#main-content" className="f1-skip-link">Pular para o conteúdo</a>
    <AppSidebar
      open={showSidebar} canWrite={canWrite} email={user.email} profile={profile}
      disciplines={disciplines} modules={modules} lessons={lessons}
      disciplineId={disciplineId} moduleId={moduleId} lessonId={lessonId}
      onClose={()=>setShowSidebar(false)} onHome={goHome}
      onCreateDiscipline={()=>showCreate('discipline')}
      onDiscipline={openDiscipline} onModule={openModule} onLesson={openLesson}
      onSignOut={()=>{if(confirmDiscard())void supabase?.auth.signOut()}}
    />
    <div className="main-area f1-main-area">
      <AppTopbar discipline={selectedDiscipline} module={selectedModule} lesson={lesson}
        onOpenMenu={()=>setShowSidebar(true)} onHome={goHome}
        onDiscipline={openDiscipline} onModule={openModule}/>
      <main className="workspace f1-workspace" id="main-content">
        {message && <div className="notice" role="status">
          {message}<button aria-label="Fechar aviso" onClick={()=>setMessage('')}><X size={16}/></button>
        </div>}
        {lesson ?
          <LessonWorkspace
            lesson={lesson} title={title} markdown={markdown} mode={mode}
            canEdit={canEdit} busy={busy} dirty={dirty} autoBreak={autoBreak}
            isDictating={dictating} theme={colors} slides={slides} previewPage={previewPage}
            noteIndex={noteIndex} noteText={noteText}
            onTitleChange={setTitle} onMarkdownChange={setMarkdown} onModeChange={setMode}
            onAutoBreakChange={setAutoBreak}
            onPreviewPageChange={index=>{setPreviewPage(index);setNoteIndex(index)}}
            onNoteIndexChange={index=>{setNoteIndex(index);setPreviewPage(index)}}
            onNoteTextChange={setNoteText}
            onSave={()=>void save()} onPublish={()=>void publish()} onPresent={startPresentation}
            onOpenThemeStudio={()=>setThemeStudioOpen(true)} onSaveNote={()=>void saveNote()}
            onDictate={dictate} onImportTemplate={file=>void importTemplate(file)}
            onUploadContentImage={uploadBackground} onNotify={setMessage}
          /> :
          selectedDiscipline ?
          <CourseOverview discipline={selectedDiscipline} module={selectedModule}
            modules={modules} lessons={lessons} canEdit={canEdit}
            onCreateModule={()=>showCreate('module')}
            onCreateLesson={()=>showCreate('lesson')}
            onToggleShare={()=>void share()}
            onOpenModule={openModule} onOpenLesson={openLesson}
          /> :
          <Dashboard canWrite={canWrite} disciplines={disciplines}
            modules={modules} lessons={lessons}
            onCreateDiscipline={()=>showCreate('discipline')}
            onOpenDiscipline={openDiscipline} onOpenLesson={openLesson}
          />}
      </main>
    </div>
    {themeStudioOpen && lesson && canEdit &&
      <ThemeStudio initial={colors} previewMarkdown={previewSlide.markdown}
        savedThemes={templates} onClose={()=>setThemeStudioOpen(false)}
        onApply={applyGlobalTheme} onSavePreset={saveThemePreset}
        onUploadImage={uploadBackground}/>}
    {presenting && lesson &&
      <Presentation slides={slides} title={title} theme={colors}
        notes={notes} canEdit={canEdit} onClose={closePresentation}/>}
    {create && <div className="modal-backdrop">
      <form className="modal" onSubmit={event=>void createEntity(event)}>
        <div className="modal-top">
          <h2>{create==='discipline'?'Nova disciplina':create==='module'?'Novo módulo':'Nova aula'}</h2>
          <button type="button" className="icon-button" onClick={()=>setCreate(null)} aria-label="Fechar"><X/></button>
        </div>
        <label>Título<input minLength={2} maxLength={180} required autoFocus value={newTitle}
          onChange={event=>setNewTitle(event.target.value)} placeholder="Digite um título"/></label>
        {create!=='lesson' && <label>Descrição<textarea value={newDesc} onChange={event=>setNewDesc(event.target.value)}
          placeholder="Descrição opcional"/></label>}
        <div className="modal-actions">
          <button type="button" className="button subtle" onClick={()=>setCreate(null)}>Cancelar</button>
          <button className="button primary" disabled={busy||newTitle.trim().length<2}>
            Criar <ChevronRight size={17}/>
          </button>
        </div>
      </form>
    </div>}
  </div>
}
