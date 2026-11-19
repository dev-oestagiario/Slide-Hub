import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {useLessonEditor} from '../../src/features/editor/useLessonEditor'
import {reconcileEditorLayout,emptyLayout} from '../../src/features/editor/layoutModel'
import {paginateSlides} from '../../src/features/editor/autoOrganizer'
import {parseSlides} from '../../src/lib/slideParser'
import type {Lesson} from '../../src/features/courses/types'

const markdown='# Aula QA\n\nTexto original.'
const initial:Lesson={id:'qa-lesson',module_id:'qa-module',title:'Aula QA',markdown,status:'draft',position:0,template_id:null,editor_revision:2,
 editor_layout:reconcileEditorLayout(paginateSlides(parseSlides(markdown,true)),emptyLayout())}
function Fixture(){
 const [lesson,setLesson]=useState(initial)
 const [notice,setNotice]=useState('')
 const editor=useLessonEditor({lesson,canEdit:true,autoBreak:true,userId:'qa-teacher',onPersist:setLesson,onNotify:setNotice})
 if(!editor.ready)return <p>Carregando</p>
 return <main>
  <label>Texto da aula<textarea value={editor.markdown} onChange={e=>editor.setMarkdown(e.target.value)}/></label>
  <button onClick={()=>void editor.save()}>Salvar</button>
  <button disabled={!editor.canUndo} onClick={editor.undo}>Desfazer</button>
  <output aria-label="Estado">{editor.status}</output>
  <output aria-label="Alterações">{editor.dirty?'pendentes':'limpas'}</output>
  <output aria-label="Revisão">{lesson.editor_revision}</output>
  <output aria-label="Aviso">{notice}</output>
 </main>
}
// Fail closed if a reused development server points to anything but the isolated local mock.
if(import.meta.env.VITE_SUPABASE_URL!==window.location.origin)throw Error('QA fixture requires local fake Supabase URL')
createRoot(document.getElementById('root')!).render(<Fixture/>)
