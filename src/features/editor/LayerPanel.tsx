import { Layers, Lock, Group, ChevronUp, ChevronDown } from 'lucide-react'
import type { EditorSlide,EditorLayout,SlideBlock } from './layoutModel'
import type { RectSet } from './multiGeometry'
const kinds:Record<SlideBlock['kind'],string>={heading:'Título',paragraph:'Texto',image:'Imagem',table:'Tabela',list:'Lista',quote:'Citação',code:'Código'}
function name(block:SlideBlock){
  const short=block.markdown.replace(/!\[([^\]]*)\]\([^)]+\)/g,'$1').replace(/^[#>*\s-]+/,'').replace(/\s+/g,' ').trim()
  return short.slice(0,55)||kinds[block.kind]
}
type Props={slide:EditorSlide;layout:EditorLayout;selected:RectSet;multiSelect:boolean;
  onPick:(id:string,additive:boolean)=>void;onLayer:(id:string,direction:1|-1)=>void}
export function LayerPanel({slide,layout,selected,multiSelect,onPick,onLayer}:Props){
  const entries=slide.blocks.map((block,index)=>({block,index,rect:layout.overrides[block.id]}))
    .sort((a,b)=>(b.rect?.z??0)-(a.rect?.z??0)||b.index-a.index)
  const ids=Object.keys(selected)
  const single=ids.length===1?ids[0]:null
  const selectedRect=single?selected[single]:null
  return <aside className="f10-layers" aria-label="Camadas do slide">
    <header><strong><Layers size={16}/> Camadas</strong><small>{entries.length} elementos</small></header>
    <div className="f10-layer-list">
      {entries.map(({block,rect})=><button key={block.id} type="button" className={'f10-layer '+(selected[block.id]?'selected':'')}
        aria-pressed={Boolean(selected[block.id])} aria-label={'Selecionar camada: '+name(block)}
        onClick={event=>onPick(block.id,multiSelect||event.shiftKey||event.ctrlKey||event.metaKey)}>
        <span className="f10-layer-copy"><strong>{name(block)}</strong><small>{kinds[block.kind]} · {rect?'Camada '+rect.z:'Automático'}</small></span>
        {rect?.group&&<Group size={14}/>}
        {rect?.locked&&<Lock size={14}/>}
      </button>)}
    </div>
    {single&&selectedRect&&<div className="f10-layer-actions">
      <button type="button" disabled={Boolean(selectedRect.locked)||selectedRect.z>=100} onClick={()=>onLayer(single,1)}><ChevronUp size={16}/> Subir camada</button>
      <button type="button" disabled={Boolean(selectedRect.locked)||selectedRect.z<=0} onClick={()=>onLayer(single,-1)}><ChevronDown size={16}/> Descer camada</button>
    </div>}
    <small>Selecione pelo nome, mesmo se o elemento estiver atrás de outro.</small>
  </aside>
}
