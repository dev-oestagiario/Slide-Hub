import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal,
  AlignEndVertical, AlignStartHorizontal, AlignStartVertical,
  ArrowDownToLine, ArrowUpToLine, Image as ImageIcon, RotateCcw, X } from 'lucide-react'
import { alignGeometry, changeLayer, fitImageGeometry, percentToRect } from './geometryTools'
import type { Alignment } from './geometryTools'
import type { BlockRect, SlideBlock } from './layoutModel'

type Props={
  block?:SlideBlock
  rect?:BlockRect
  onChange:(rect:BlockRect)=>void
  onReset:()=>void
  onClear:()=>void
}
const fields=[
  ['x','Posição X'],['y','Posição Y'],['w','Largura'],['h','Altura']
] as const

/** Optional precision controls live below the 16:9 canvas, not on top of content. */
export function SlideInspector({block,rect,onChange,onReset,onClear}:Props){
  if(!block||!rect)return <div className="f7-inspector f7-inspector-empty" role="status">
    Selecione um elemento para ajustar posição, tamanho e alinhamento.
  </div>
  const alignments:Array<{key:Alignment;label:string;icon:typeof AlignCenterHorizontal}>= [
    {key:'left',label:'Alinhar à esquerda',icon:AlignStartVertical},
    {key:'centerX',label:'Centralizar horizontalmente',icon:AlignCenterHorizontal},
    {key:'right',label:'Alinhar à direita',icon:AlignEndVertical},
    {key:'top',label:'Alinhar ao topo',icon:AlignStartHorizontal},
    {key:'centerY',label:'Centralizar verticalmente',icon:AlignCenterVertical},
    {key:'bottom',label:'Alinhar à base',icon:AlignEndHorizontal}
  ]
  return <section className="f7-inspector" aria-label="Propriedades do elemento selecionado">
    <header className="f7-inspector-header">
      <div><strong>{block.kind==='image'?'Imagem':block.kind==='heading'?'Título':block.kind==='paragraph'?'Texto':block.kind==='list'?'Lista':block.kind==='quote'?'Citação':block.kind==='table'?'Tabela':'Código'}</strong>
        <small>Propriedades do elemento</small></div>
      <button type="button" onClick={onClear} aria-label="Desmarcar elemento" title="Desmarcar"><X size={16}/></button>
    </header>
    <div className="f7-inspector-fields">
      {fields.map(([field,label])=><label key={field}>
        <span>{label} (%)</span>
        <input type="number" min={0} max={100} step={1} aria-label={label}
          value={Math.round(rect[field]*100)}
          onChange={event=>onChange(percentToRect(rect,field,Number(event.target.value)))}/>
      </label>)}
    </div>
    <div className="f7-inspector-options">
      <div className="f7-tool-group" role="group" aria-label="Alinhamento">
        {alignments.map(({key,label,icon:Icon})=><button type="button" key={key}
          onClick={()=>onChange(alignGeometry(rect,key))} title={label} aria-label={label}>
          <Icon size={16}/>
        </button>)}
      </div>
      <div className="f7-tool-group" role="group" aria-label="Camadas">
        <button type="button" onClick={()=>onChange(changeLayer(rect,'backward'))}
          title="Enviar para trás" aria-label="Enviar para trás"><ArrowDownToLine size={16}/></button>
        <button type="button" onClick={()=>onChange(changeLayer(rect,'forward'))}
          title="Trazer para frente" aria-label="Trazer para frente"><ArrowUpToLine size={16}/></button>
      </div>
    </div>
    <div className="f7-inspector-bottom">
      {block.kind==='image'&&<button type="button" onClick={()=>onChange(fitImageGeometry(rect))}>
        <ImageIcon size={15}/> Ajustar imagem ao slide
      </button>}
      <button type="button" onClick={onReset}><RotateCcw size={15}/> Layout automático</button>
    </div>
    <p>Arraste no slide ou use as setas. Shift movimenta mais rápido; Alt desativa o encaixe.</p>
  </section>
}
