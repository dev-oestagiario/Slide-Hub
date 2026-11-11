import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { parseSlides } from '../../src/lib/slideParser'
import { DEFAULT_SLIDE_THEME, slideBackgroundStyle } from '../../src/lib/slideThemes'
import { paginateSlides } from '../../src/features/editor/autoOrganizer'
import { editorSlides, emptyLayout, reconcileEditorLayout, resetBlockRect, setBlockRect } from '../../src/features/editor/layoutModel'
import type { EditorLayout } from '../../src/features/editor/layoutModel'
import { SlideBlockCanvas } from '../../src/features/editor/SlideBlockCanvas'
import type { CanvasSelection } from '../../src/features/editor/SlideBlockCanvas'
import { SlideInspector } from '../../src/features/editor/SlideInspector'
import '../../src/styles.css'
import '../../src/styles/f1.css'
import '../../src/styles/f3.css'
import '../../src/styles/f4.css'
import '../../src/styles/f5.css'
import '../../src/styles/f7.css'

const initial='# Diagramas na aula\n\n![Ilustração grande](./giant-image.svg)\n\n'
  +Array.from({length:14},(_,index)=>'Conceito '+index+' com uma explicação importante para os alunos.').join('\n\n')
function Demo(){
  const [markdown,setMarkdown]=useState(initial)
  const slides=useMemo(()=>paginateSlides(parseSlides(markdown,false)),[markdown])
  const [layout,setLayout]=useState<EditorLayout>(()=>reconcileEditorLayout(slides,emptyLayout()))
  const [page,setPage]=useState(0)
  const [editing,setEditing]=useState(false)
  const [selection,setSelection]=useState<CanvasSelection|null>(null)
  useEffect(()=>{setLayout(previous=>reconcileEditorLayout(slides,previous))},[slides])
  useEffect(()=>setSelection(null),[page])
  const chosen=slides[Math.min(page,slides.length-1)]
  const slide=editorSlides(slides,layout)[Math.min(page,slides.length-1)]
  const selectedBlock=slide?.blocks.find(block=>block.id===selection?.id)
  const selectedRect=selection&&(layout.overrides[selection.id]??selection.rect)
  return <main style={{padding:16,maxWidth:800,margin:'auto'}}>
    <header style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
      <strong>{slides.length} slides automáticos</strong>
      <button type="button" onClick={()=>setEditing(!editing)}>Organizar visualmente</button>
      <button type="button" onClick={()=>setPage(index=>Math.max(0,index-1))}>Slide anterior</button>
      <button type="button" onClick={()=>setPage(index=>Math.min(slides.length-1,index+1))}>Próximo slide</button>
      <span>{page+1} de {slides.length}</span>
    </header>
    <div className="f1-preview-stage f7-preview-stage">
      <div className="f7-preview-scroller">
        <div className="mini-slide f3-lesson-preview" style={slideBackgroundStyle(DEFAULT_SLIDE_THEME)}>
          <div className="f3-preview-content f4-preview-shell">
            {slide&&<SlideBlockCanvas slide={slide} layout={layout}
              arranging={editing} editable={true}
              selection={selection} onSelect={setSelection}
              onGeometry={(id,rect)=>setLayout(before=>setBlockRect(before,id,rect))}
              onReset={id=>setLayout(before=>resetBlockRect(before,id))}/>}
          </div>
        </div>
      </div>
    </div>
    {editing&&<SlideInspector block={selectedBlock} rect={selectedRect||undefined}
      onChange={rect=>selection&&setLayout(before=>setBlockRect(before,selection.id,rect))}
      onReset={()=>{if(selection){setLayout(before=>resetBlockRect(before,selection.id));setSelection(null)}}}
      onClear={()=>setSelection(null)}/>}
    <label style={{display:'grid',gap:8,marginTop:20}}>Texto da aula
      <textarea aria-label="Texto da aula" rows={5} style={{width:'100%'}} value={markdown}
        onChange={event=>setMarkdown(event.target.value)}/>
    </label>
  </main>
}
createRoot(document.getElementById('root')!).render(<Demo/>)
