import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronRight, GraduationCap, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import { Presentation } from './components/Presentation'
import { ThemeStudio } from './components/ThemeStudio'
import { DEFAULT_SLIDE_THEME, normalizeSlideTheme } from './lib/slideThemes'
import type { SlideTheme } from './lib/slideThemes'
import { AppSidebar } from './features/navigation/AppSidebar'
import { AppTopbar } from './features/navigation/AppTopbar'
import { Dashboard } from './features/dashboard/Dashboard'
import { CourseOverview } from './features/courses/CourseOverview'
import { LessonWorkspace } from './features/lessons/LessonWorkspace'
import { TemplateLibrary } from './features/templates/TemplateLibrary'
import { configFromSnapshot, layoutPresentation, normalizePresentationTemplate, presentationApplyPatch, themeOverrideSnapshot } from './features/templates/model'
import type { PresentationTemplateConfig, PresentationTemplateRecord, TemplateChoice } from './features/templates/model'
import type { Profile, Discipline, CourseModule as Module, Lesson, SlideTemplate, SpeakerNote as Note } from './features/courses/types'
import { useLessonEditor } from './features/editor/useLessonEditor'
import { editorSlides } from './features/editor/layoutModel'

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
  const [presentationTemplates,setPresentationTemplates]=useState<PresentationTemplateRecord[]>([])
  const [templateLibraryOpen,setTemplateLibraryOpen]=useState(false)
  const [mode,setMode]=useState<'edit'|'article'>('edit'),[presenting,setPresenting]=useState(false)
  const [create,setCreate]=useState<'discipline'|'module'|'lesson'|null>(null),[newTitle,setNewTitle]=useState(''),[newDesc,setNewDesc]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const [themeConfig,setThemeConfig]=useState<SlideTheme>(DEFAULT_SLIDE_THEME),[themeStudioOpen,setThemeStudioOpen]=useState(false),[autoBreak,setAutoBreak]=useState(true),[notes,setNotes]=useState<Note[]>([]),[noteIndex,setNoteIndex]=useState(0),[noteText,setNoteText]=useState(''),[showSidebar,setShowSidebar]=useState(false)
  const [previewPage,setPreviewPage] = useState(0)
  const [dictating,setDictating] = useState(false)
  const recognition=useRef<{stop:()=>void}|null>(null)
  const selectedDiscipline=disciplines.find(d=>d.id===disciplineId),selectedModule=modules.find(m=>m.id===moduleId),lesson=lessons.find(l=>l.id===lessonId)
  const course=disciplines.find(d=>d.id===modules.find(m=>m.id===lesson?.module_id)?.discipline_id)??selectedDiscipline
  const canWrite=profile?.role==='teacher'||profile?.role==='admin',canEdit=Boolean(canWrite && course?.owner_id===user?.id)
  const editor=useLessonEditor({
    lesson,canEdit,autoBreak,userId:user?.id,
    onPersist:row=>setLessons(items=>items.map(item=>item.id===row.id?row:item)),
    onNotify:setMessage
  })
  const {markdown,title,dirty,status:saveStatus,setMarkdown,setTitle}=editor
  const parsedSlides=editor.parsed
  const activePresentation=useMemo(()=>configFromSnapshot(lesson?.presentation_template_snapshot),[lesson?.presentation_template_snapshot])
  const slides=useMemo(()=>layoutPresentation(parsedSlides,activePresentation),[parsedSlides,activePresentation])
  const slideModels=useMemo(()=>editorSlides(slides,editor.layout),[slides,editor.layout])
  const template=templates.find(t=>t.id===lesson?.template_id),colors=themeConfig
  const ownedLessons=lessons.filter(item=>disciplines.some(discipline=>discipline.owner_id===user?.id
    && modules.some(module=>module.id===item.module_id&&module.discipline_id===discipline.id)))
  const previewSlide=slides[Math.min(previewPage,slides.length-1)]
  useEffect(()=>{if(!supabase){setBooting(false);return}supabase.auth.getUser().then(({data})=>{setUser(data.user);setBooting(false)}).catch(()=>setBooting(false));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user??null));return ()=>subscription.unsubscribe()},[])
  async function refresh(){
    if(!supabase||!user)return
    const [p,d,m,l,t,pt]=await Promise.all([supabase.from('profiles').select('*').eq('id',user.id).maybeSingle(),supabase.from('disciplines').select('*').order('created_at',{ascending:false}),supabase.from('modules').select('*').order('position'),supabase.from('lessons').select('*').order('position'),supabase.from('slide_templates').select('*'),supabase.from('presentation_templates').select('*').eq('owner_id',user.id).order('updated_at',{ascending:false})])
    const error=[p.error,d.error,m.error,l.error,t.error].filter(Boolean).map(x=>x?.message).join(' / ')
    if(error)setMessage(error)
    if(pt.error)setMessage('Biblioteca de templates indisponível. Aplique a migração F2 no Supabase: '+pt.error.message)
    setProfile(p.data as Profile|null);setDisciplines((d.data||[]) as Discipline[]);setModules((m.data||[]) as Module[]);setLessons((l.data||[]) as Lesson[]);setTemplates((t.data||[]) as SlideTemplate[])
    setPresentationTemplates((pt.data||[]) as PresentationTemplateRecord[])
  }
  useEffect(()=>{if(!user){setProfile(null);setDisciplines([]);setModules([]);setLessons([]);setPresentationTemplates([]);setTemplateLibraryOpen(false);return}void refresh()},[user?.id])
  useEffect(()=>{setMode('edit');setNoteIndex(0);setPreviewPage(0)},[lesson?.id])
  useEffect(()=>{const raw=lesson?.theme_config&&typeof lesson.theme_config==='object'&&Object.keys(lesson.theme_config).length?lesson.theme_config:template?.config;setThemeConfig(normalizeSlideTheme(raw))},[lesson?.id,lesson?.theme_config,template?.config])
  useEffect(()=>{if(!lessonId||!canEdit||!supabase){setNotes([]);return}let active=true;supabase.from('speaker_notes').select('*').eq('lesson_id',lessonId).then(({data})=>{if(active)setNotes((data||[]) as Note[])});return ()=>{active=false}},[lessonId,canEdit])
  const noteSlideKey=slideModels[noteIndex]?.key
  useEffect(()=>{
    const note=notes.find(n=>n.slide_key&&n.slide_key===noteSlideKey)
      ??notes.find(n=>!n.slide_key&&n.slide_index===noteIndex)
    setNoteText(note?.notes||'')
  },[notes,noteIndex,noteSlideKey])
  const noteBackfill=useRef(new Set<string>())
  useEffect(()=>{noteBackfill.current.clear()},[lessonId])
  useEffect(()=>{
    if(!supabase||!lessonId||!canEdit||!editor.ready||dirty||saveStatus!=='saved')return
    for(const note of notes){
      const stableKey=slideModels[note.slide_index]?.key
      if(!note.id||note.slide_key||!stableKey||noteBackfill.current.has(note.id))continue
      noteBackfill.current.add(note.id)
      void supabase.from('speaker_notes').update({slide_key:stableKey})
        .eq('id',note.id).is('slide_key',null).select('*').maybeSingle().then(({data,error})=>{
          if(error)noteBackfill.current.delete(note.id!)
          if(data)setNotes(items=>items.map(item=>item.id===note.id?data as Note:item))
        })
    }
  },[notes,slideModels,lessonId,canEdit,editor.ready,dirty,saveStatus])
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
    setDisciplineId(null);setModuleId(null);setLessonId(null);setShowSidebar(false);setTemplateLibraryOpen(false)
  }
  function openDiscipline(id:string){if(!confirmDiscard())return;setDisciplineId(id);setModuleId(null);setLessonId(null);setShowSidebar(false);setTemplateLibraryOpen(false)}
  function openModule(id:string){if(!confirmDiscard())return;setModuleId(id);setDisciplineId(modules.find(m=>m.id===id)?.discipline_id||null);setLessonId(null);setShowSidebar(false);setTemplateLibraryOpen(false)}
  function openLesson(l:Lesson){if(l.id!==lessonId&&!confirmDiscard())return;setLessonId(l.id);setModuleId(l.module_id);setDisciplineId(modules.find(m=>m.id===l.module_id)?.discipline_id||null);setShowSidebar(false);setTemplateLibraryOpen(false)}
  function openTemplateLibrary(){if(!canWrite)return;setTemplateLibraryOpen(true);setShowSidebar(false)}
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
  async function save(){if(!canEdit)return;const done=await editor.save();if(done)setMessage('Aula salva.')}
  
  async function publish(){
    if(!supabase||!lesson||!canEdit)return
    const persisted=await editor.save()
    if(!persisted){setMessage('Salve a aula antes de alterar sua publicação.');return}
    const status=lesson.status==='published'?'draft':'published'
    const {data,error}=await supabase.from('lessons').update({status}).eq('id',lesson.id).select('*').maybeSingle()
    if(error||!data){setMessage(error?.message||'Falha ao alterar a publicação.');return}
    setLessons(items=>items.map(item=>item.id===lesson.id?data as Lesson:item))
    setMessage('Publicação atualizada.')
  }
  async function share(){if(!supabase||!selectedDiscipline||!canEdit)return;const {error}=await supabase.from('disciplines').update({is_public:!selectedDiscipline.is_public}).eq('id',selectedDiscipline.id);if(error)setMessage(error.message);else await refresh()}
  async function saveNote(){
    if(!supabase||!lesson||!canEdit||!noteSlideKey)return
    const previous=notes.find(note=>note.slide_key===noteSlideKey)
      ??notes.find(note=>!note.slide_key&&note.slide_index===noteIndex)
    // Keep the old unique (lesson_id, slide_index) for running clients.
    // Existing keyed notes retain their historical index; new notes use a free
    // numeric slot if inserting a slide displaced an older note.
    const taken=new Set(notes.map(note=>note.slide_index))
    const storageIndex=previous?.slide_index
      ??(taken.has(noteIndex)?Math.max(-1,...taken)+1:noteIndex)
    const payload={lesson_id:lesson.id,slide_index:storageIndex,slide_key:noteSlideKey,notes:noteText}
    const query=previous?.id
      ?supabase.from('speaker_notes').update(payload).eq('id',previous.id).select('*').maybeSingle()
      :supabase.from('speaker_notes').insert(payload).select('*').maybeSingle()
    const {data,error}=await query
    if(error||!data){setMessage(error?.message||'Não foi possível salvar a nota.');return}
    setNotes(items=>[...items.filter(item=>item.id!==previous?.id&&item.slide_key!==noteSlideKey),data as Note])
    setMessage('Nota salva e vinculada ao slide.')
  }
  async function importTemplate(file:File){if(!supabase||!user||!canWrite)return;try{if(file.size>100000)throw Error('Arquivo muito grande (máximo 100 KB).');const raw=JSON.parse(await file.text()) as Record<string,unknown>;const config=raw.config||raw;if(!isTheme(config))throw Error('JSON inválido. Use cores hex em background, foreground e accent.');const name=String(raw.name||file.name.replace(/\.json$/i,''));const {error}=await supabase.from('slide_templates').insert({owner_id:user.id,name:name.slice(0,100),config:normalizeSlideTheme(config)});if(error)throw error;await refresh();setMessage('Template importado.')}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível importar.')}} 
  async function applyGlobalTheme(next:SlideTheme):Promise<boolean>{
    if(!supabase||!lesson||!canEdit)return false
    const config=normalizeSlideTheme(next)
    const snapshot=themeOverrideSnapshot(lesson.presentation_template_snapshot,config)
    const patch=snapshot?{theme_config:config,template_id:null,presentation_template_snapshot:snapshot}:{theme_config:config,template_id:null}
    const {data,error}=await supabase.from('lessons').update(patch)
      .eq('id',lesson.id).select('id').single()
    if(error||!data){setMessage(error?.message||'Erro ao aplicar tema.');return false}
    setLessons(list=>list.map(item=>item.id===lesson.id?{...item,...patch}:item))
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
  async function createPresentationTemplate(name:string,description:string,config:PresentationTemplateConfig):Promise<PresentationTemplateRecord|null>{
    if(!supabase||!user||!canWrite)return null
    const {data,error}=await supabase.from('presentation_templates')
      .insert({owner_id:user.id,name,description,config:normalizePresentationTemplate(config)})
      .select('*').single()
    if(error||!data){setMessage(error?.message||'Não foi possível criar o template.');return null}
    const result=data as PresentationTemplateRecord
    setPresentationTemplates(items=>[result,...items])
    setMessage('Template salvo em Meus templates.')
    return result
  }
  async function updatePresentationTemplate(id:string,revision:number,name:string,description:string,config:PresentationTemplateConfig):Promise<PresentationTemplateRecord|null>{
    if(!supabase||!user||!canWrite)return null
    const {data,error}=await supabase.from('presentation_templates')
      .update({name,description,config:normalizePresentationTemplate(config)})
      .eq('id',id).eq('owner_id',user.id).eq('revision',revision).select('*').maybeSingle()
    if(error||!data){setMessage(error?.message||'Este template mudou em outra janela. Reabra para atualizar.');return null}
    const result=data as PresentationTemplateRecord
    setPresentationTemplates(items=>items.map(item=>item.id===id?result:item))
    setMessage('Template atualizado. Aulas antigas mantêm o modelo aplicado.')
    return result
  }
  async function duplicatePresentationTemplate(choice:TemplateChoice):Promise<PresentationTemplateRecord|null>{
    return createPresentationTemplate((choice.name+' (cópia)').slice(0,100),choice.description,choice.config)
  }
  async function deletePresentationTemplate(record:PresentationTemplateRecord):Promise<boolean>{
    if(!supabase||!user||!canWrite)return false
    const {data,error}=await supabase.from('presentation_templates')
      .delete().eq('id',record.id).eq('owner_id',user.id).select('id').maybeSingle()
    if(error||!data){setMessage(error?.message||'Não foi possível excluir o template.');return false}
    setPresentationTemplates(items=>items.filter(item=>item.id!==record.id))
    setLessons(items=>items.map(item=>item.presentation_template_id===record.id
      ?{...item,presentation_template_id:null}:item))
    setMessage('Template excluído. As aulas conservaram o visual aplicado.')
    return true
  }
  async function applyPresentationTemplate(choice:TemplateChoice,targetId:string):Promise<boolean>{
    if(!supabase||!user||!canWrite)return false
    const current=ownedLessons.find(item=>item.id===targetId)
    if(!current){setMessage('Selecione uma aula sua para aplicar o template.');return false}
    if(choice.kind==='personal'&&!presentationTemplates.some(item=>item.id===choice.id&&item.owner_id===user.id)){
      setMessage('Você não tem acesso a este template.');return false
    }
    const patch=presentationApplyPatch(choice)
    const {data,error}=await supabase.from('lessons').update(patch).eq('id',targetId).select('id').maybeSingle()
    if(error||!data){setMessage(error?.message||'Não foi possível aplicar o template.');return false}
    setLessons(items=>items.map(item=>item.id===targetId?{...item,...patch}:item))
    if(targetId===lessonId)setThemeConfig(patch.theme_config)
    setMessage('Template aplicado. Texto, notas e gabaritos foram preservados.')
    setTemplateLibraryOpen(false)
    return true
  }
  async function uploadBackground(file:File):Promise<string>{
    if(!supabase||!user||!canWrite)throw Error('Apenas professores podem enviar imagens.')
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
      templatesActive={templateLibraryOpen} onTemplates={openTemplateLibrary}
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
        {templateLibraryOpen && !lesson && canWrite ?
          <TemplateLibrary
            records={presentationTemplates} lessons={ownedLessons} canWrite={canWrite}
            onClose={goHome} onCreate={createPresentationTemplate} onUpdate={updatePresentationTemplate}
            onDuplicate={duplicatePresentationTemplate} onDelete={deletePresentationTemplate}
            onApply={applyPresentationTemplate} onUploadImage={uploadBackground} onNotify={setMessage}
          /> :
          lesson ?
          <LessonWorkspace
            lesson={lesson} title={title} markdown={markdown} mode={mode}
            canEdit={canEdit} busy={busy} dirty={dirty} autoBreak={autoBreak}
            saveStatus={saveStatus} editorReady={editor.ready} activeTemplate={activePresentation}
            editorLayout={editor.layout} editorSlides={slideModels}
            onUpdateGeometry={editor.updateGeometry} onResetGeometry={editor.resetGeometry}
            onGeometryStart={editor.checkpoint} onUndoGeometry={editor.undo}
            onRedoGeometry={editor.redo} canUndoGeometry={editor.canUndo} canRedoGeometry={editor.canRedo}
            isDictating={dictating} theme={colors} slides={slides} previewPage={previewPage}
            noteIndex={noteIndex} noteText={noteText}
            onTitleChange={setTitle} onMarkdownChange={setMarkdown} onModeChange={setMode}
            onAutoBreakChange={setAutoBreak}
            onPreviewPageChange={index=>{setPreviewPage(index);setNoteIndex(index)}}
            onNoteIndexChange={index=>{setNoteIndex(index);setPreviewPage(index)}}
            onNoteTextChange={setNoteText}
            onSave={()=>void save()} onPublish={()=>void publish()} onPresent={startPresentation}
            onOpenThemeStudio={()=>setThemeStudioOpen(true)} onOpenTemplateLibrary={openTemplateLibrary} onSaveNote={()=>void saveNote()}
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
            onOpenTemplates={openTemplateLibrary} onOpenDiscipline={openDiscipline} onOpenLesson={openLesson}
          />}
      </main>
    </div>
    {templateLibraryOpen && lesson && canEdit && <div className="f2-overlay" role="dialog" aria-modal="true" aria-label="Biblioteca de templates">
      <div className="f2-overlay-dialog"><TemplateLibrary
        records={presentationTemplates} lessons={ownedLessons} currentLesson={lesson}
        previewMarkdown={slides[Math.min(previewPage,slides.length-1)]?.markdown}
        canWrite={canWrite} onClose={()=>setTemplateLibraryOpen(false)}
        onCreate={createPresentationTemplate} onUpdate={updatePresentationTemplate}
        onDuplicate={duplicatePresentationTemplate} onDelete={deletePresentationTemplate}
        onApply={applyPresentationTemplate} onUploadImage={uploadBackground} onNotify={setMessage}
      /></div>
    </div>}
    {themeStudioOpen && lesson && canEdit &&
      <ThemeStudio initial={colors} previewMarkdown={previewSlide.markdown}
        savedThemes={templates} onClose={()=>setThemeStudioOpen(false)}
        onApply={applyGlobalTheme} onSavePreset={saveThemePreset}
        onUploadImage={uploadBackground}/>}
    {presenting && lesson &&
      <Presentation slides={slides} title={title} theme={colors} template={activePresentation}
        editorLayout={editor.layout} editorSlides={slideModels}
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
