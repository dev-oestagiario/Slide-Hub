import { useRef,useState } from 'react'
import { ChevronLeft,ChevronRight,CopyPlus,Shapes } from 'lucide-react'
import { SlideMiniature } from './SlideMiniature'
import type {EditorLayout,EditorSlide} from './layoutModel'
import type {SlideTheme} from '../../lib/slideThemes'
import type {PresentationTemplateConfig} from '../templates/model'
import { SlideShape } from './SlideShape'
import { SHAPES } from './slideOperations'
import type { ShapeKind,SlideOperation } from './slideOperations'
import type { Slide } from '../../lib/slideParser'
import type { FlowSlide } from './autoOrganizer'
const names:Record<ShapeKind,string>={rectangle:'Retângulo',rounded:'Retângulo arredondado',circle:'Círculo',triangle:'Triângulo',diamond:'Losango',line:'Linha',arrow:'Seta',check:'Marca de seleção',star:'Estrela',info:'Informação'}
function thumbnail(slide:Slide){
  const lines=slide.markdown.split('\n').filter(x=>x.trim()&&!/^\s*(?:!\[|<|\x60|~)/.test(x))
  const title=lines[0]?.replace(/^#+\s*/,'').slice(0,70)||'Slide'
  const content=lines.slice(1,4).map(line=>line.replace(/[*_#]/g,'').slice(0,70))
  return {title,content}
}
export function SlideLibrary({slides,page,canEdit,onPick,onOperation,models,layout,theme,template}:{slides:Slide[];page:number;canEdit:boolean;onPick:(i:number)=>void;onOperation:(op:SlideOperation)=>void;models?:EditorSlide[];layout?:EditorLayout;theme?:SlideTheme;template?:PresentationTemplateConfig|null}){
  const [shapes,setShapes]=useState(false)
  const dragging=useRef<number|null>(null)
  const [dropTarget,setDropTarget]=useState<number|null>(null)
  const source=(slides[page] as FlowSlide|undefined)?.originalIndex??page
  const final=(slides.at(-1) as FlowSlide|undefined)?.originalIndex??slides.length-1
  return <aside className="f12-library" aria-label="Miniaturas e elementos">
    <header><strong>Slides</strong><small>{slides.length} páginas</small></header>
    <nav className="f12-thumbs" aria-label="Miniaturas dos slides">
      {slides.map((s,i)=>{const preview=thumbnail(s)
        const full=Boolean(models?.[i]&&layout&&theme)
        const sourceIndex=(s as FlowSlide).originalIndex??i
        return <div key={models?.[i]?.key??i} className={'f13-thumb-wrap'+(i===dropTarget?' f13-drop-target':'')}
          draggable={canEdit} onDragStart={event=>{
            if(!canEdit)return
            dragging.current=i;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',String(i))
          }} onDragEnd={()=>{dragging.current=null;setDropTarget(null)}}
          onDragOver={event=>{if(dragging.current===null||sourceIndex===((slides[dragging.current] as FlowSlide)?.originalIndex??dragging.current))return
            event.preventDefault();event.dataTransfer.dropEffect='move';setDropTarget(i)}}
          onDrop={event=>{event.preventDefault();const from=dragging.current;dragging.current=null;setDropTarget(null)
            if(from!==null&&from!==i&&canEdit&&sourceIndex!==((slides[from] as FlowSlide)?.originalIndex??from))onOperation({type:'reorder',fromPage:from,toPage:i})
          }}>
          {full&&<SlideMiniature model={models![i]} layout={layout!} theme={theme!} template={template} index={i} total={slides.length}/>}
          <button type="button" className={'f12-thumb '+(i===page?'selected':'')+(full?' f13-thumb-button':'')}
            aria-label={'Selecionar slide '+(i+1)+': '+preview.title} aria-current={i===page?'page':undefined} onClick={()=>onPick(i)}>
            {!full&&<span className={'f12-thumb-art '+(s.theme==='dark'?'dark':'')}><strong>{preview.title}</strong>{preview.content.map((line,j)=><span key={j}>{line}</span>)}</span>}
            <small>{i+1}{(s as FlowSlide).continuation?' · Continuação':''}</small>
          </button>
        </div>
      })}
    </nav>
    {canEdit&&<>
      <div className="f12-library-actions">
        <button type="button" disabled={source<=0} onClick={()=>onOperation({type:'move',direction:-1})} aria-label="Mover seção para trás" title="Mover seção para trás"><ChevronLeft size={15}/></button>
        <button type="button" disabled={source>=final} onClick={()=>onOperation({type:'move',direction:1})} aria-label="Mover seção para frente" title="Mover seção para frente"><ChevronRight size={15}/></button>
        <button type="button" onClick={()=>onOperation({type:'duplicate'})}><CopyPlus size={15}/> Duplicar seção</button>
        <button type="button" aria-expanded={shapes} onClick={()=>setShapes(v=>!v)}><Shapes size={15}/> Elementos</button>
      </div>
      {shapes&&<div className="f12-shape-grid" role="group" aria-label="Formas disponíveis">
        {SHAPES.map(shape=><button type="button" key={shape} onClick={()=>onOperation({type:'shape',shape})} aria-label={'Inserir '+names[shape]}><SlideShape value={shape}/><span>{names[shape]}</span></button>)}
      </div>}
      <small>Arraste uma miniatura para mudar a ordem no desktop. Use os botões no celular. As continuações acompanham a seção original.</small>
    </>}
  </aside>
}
