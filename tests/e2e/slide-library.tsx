import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {useLessonEditor} from '../../src/features/editor/useLessonEditor'
import {Presentation} from '../../src/components/Presentation'
import {MotionPanel} from '../../src/features/editor/MotionPanel'
import {revealOrder} from '../../src/features/editor/motionModel'
import {SlideLibrary} from '../../src/features/editor/SlideLibrary'
import {SlideBlockCanvas} from '../../src/features/editor/SlideBlockCanvas'
import {ExportPages} from '../../src/features/export/ExportPages'
import {buildExportPlan} from '../../src/features/export/exportModel'
import {DEFAULT_SLIDE_THEME} from '../../src/lib/slideThemes'
import type {Lesson} from '../../src/features/courses/types'
import '../../src/styles.css'
import '../../src/styles/f3.css'
import '../../src/styles/f4.css'
import '../../src/styles/f5.css'
import '../../src/styles/f7.css'
const lesson:Lesson={id:'f12-test-lesson',module_id:'test',title:'Aula QA',
 markdown:'# Seção A\n\nTexto A.\n\n:::answer\nGABARITO RESERVADO\n:::\n\n<!-- slide: layout=split -->\n## Seção B\n\nTexto B.',
 status:'draft',position:0,template_id:null}
function Fixture(){
 const [page,setPage]=useState(0)
 const [notice,setNotice]=useState('')
 const [exports,setExports]=useState(false)
 const [presenting,setPresenting]=useState(false)
 const [selected,setSelected]=useState(0)
 const [preview,setPreview]=useState<number|undefined>()
 const [nonce,setNonce]=useState(0)
 const editor=useLessonEditor({lesson,canEdit:true,autoBreak:true,onPersist:()=>{},onNotify:setNotice})
 const active=Math.min(page,editor.parsed.length-1)
 const model=editor.slideModel[active]
 if(!editor.ready)return <p>Carregando</p>
 return <main style={{maxWidth:750,margin:'auto',padding:16}}>
  <label>Texto da aula<textarea rows={5} aria-label="Texto da aula" value={editor.markdown} onChange={e=>editor.setMarkdown(e.target.value)}/></label>
  <div><button disabled={!editor.canUndo} onClick={editor.undo}>Desfazer</button>
   <button disabled={!editor.canRedo} onClick={editor.redo}>Refazer</button>
   <button onClick={()=>{if(model?.blocks[0]){editor.checkpoint();editor.updateGeometry(model.blocks[0].id,{x:.2,y:.1,w:.4,h:.2,z:2})}}}>Fixar título</button>
   <button onClick={()=>setExports(v=>!v)}>Ver exportação</button></div>
  <SlideLibrary slides={editor.parsed} models={editor.slideModel} layout={editor.layout} theme={DEFAULT_SLIDE_THEME} page={active} canEdit={editor.ready} onPick={setPage} onOperation={op=>{const next=editor.slideOperation(active,op);if(next!==null)setPage(next)}}/>
  <div style={{height:240,position:'relative',overflow:'hidden'}} aria-label="Prévia da seção">{model&&<SlideBlockCanvas key={nonce} slide={model} layout={editor.layout} motionStep={preview}/>}</div>
  <button onClick={()=>setSelected(0)}>Selecionar título para animação</button>
  <button onClick={()=>setSelected(1)}>Selecionar texto para animação</button>
  <button onClick={()=>setPresenting(true)}>Apresentar aula QA</button>
  {model&&<MotionPanel slide={model} motion={editor.layout.motion} block={model.blocks[selected]} locked={false} step={preview}
    onChange={value=>{editor.updateMotion(value);setPreview(undefined)}} onPreview={()=>{setNonce(v=>v+1);setPreview(0)}}
    onAdvance={()=>setPreview(v=>Math.min((v??0)+1,revealOrder(model.blocks,editor.layout.motion).length))} onStop={()=>setPreview(undefined)}/>}
  <span role="status">{notice}</span>
  {presenting&&<Presentation title={editor.title} slides={editor.parsed} editorSlides={editor.slideModel} editorLayout={editor.layout} theme={DEFAULT_SLIDE_THEME} canEdit={true} notes={[]} onClose={()=>setPresenting(false)}/>}
  {exports&&<ExportPages plan={buildExportPlan({title:editor.title,slides:editor.parsed,theme:DEFAULT_SLIDE_THEME,editorLayout:editor.layout})}/>}
 </main>
}
createRoot(document.getElementById('root')!).render(<Fixture/>)
