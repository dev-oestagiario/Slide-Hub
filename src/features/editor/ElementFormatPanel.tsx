import { useState } from 'react'
import { Copy, CopyPlus, Pencil, RotateCcw } from 'lucide-react'
import type { BlockRect, SlideBlock, ElementStyle } from './layoutModel'
import { editableText, duplicable } from './sourceEdits'

type Props={block:SlideBlock;rect:BlockRect;onChange:(rect:BlockRect)=>void;
  onEdit:()=>void;onDuplicate:()=>boolean}
export function ElementFormatPanel({block,rect,onChange,onEdit,onDuplicate}:Props){
  const [message,setMessage]=useState('')
  const style=rect.style??{}
  const update=(key:keyof ElementStyle,value:ElementStyle[keyof ElementStyle]|undefined)=>{
    const next={...style,[key]:value}
    onChange({...rect,style:next})
  }
  const color=(key:'color'|'background'|'borderColor',label:string,fallback:string)=><div className="f11-color-field">
    <label>{label}<input aria-label={label} type="color" value={style[key]??fallback}
      onChange={event=>update(key,event.target.value)}/></label>
    {style[key]&&<button type="button" onClick={()=>update(key,undefined)} aria-label={'Remover '+label}>×</button>}
  </div>
  async function copy(){
    try{
      await navigator.clipboard.writeText(block.markdown)
      setMessage('Markdown copiado.')
    }catch{setMessage('O navegador não permitiu copiar. Use o editor Escrever.')}
  }
  return <section className="f11-format-panel" aria-label="Aparência do elemento">
    <header><strong>Aparência do elemento</strong><button type="button" onClick={()=>onChange({...rect,style:undefined})}><RotateCcw size={14}/> Restaurar estilos</button></header>
    <div className="f11-action-row">
      {editableText(block.kind)&&<button type="button" onClick={onEdit}><Pencil size={15}/> Editar texto</button>}
      <button type="button" onClick={()=>void copy()}><Copy size={15}/> Copiar Markdown</button>
      {duplicable(block.kind)&&<button type="button" onClick={()=>setMessage(onDuplicate()?'Elemento duplicado.':'Não foi possível duplicar com segurança.')}><CopyPlus size={15}/> Duplicar elemento</button>}
    </div>
    {block.kind!=='image'&&<div className="f11-fields">
      <label>Fonte<select aria-label="Fonte do elemento" value={style.font??''} onChange={e=>update('font',e.target.value||undefined)}>
        <option value="">Do template</option><option value="system">Sem serifa</option><option value="serif">Com serifa</option><option value="mono">Monoespaçada</option>
      </select></label>
      <label>Tamanho relativo (%)<input aria-label="Tamanho da fonte" type="number" min={50} max={200} value={style.size??100} onChange={e=>update('size',Number(e.target.value))}/></label>
      {color('color','Cor do texto','#182b2b')}
    </div>}
    {block.kind==='image'&&<div className="f11-fields">
      <label>Ajuste da imagem<select aria-label="Ajuste da imagem" value={style.imageFit??'contain'} onChange={e=>update('imageFit',e.target.value)}>
        <option value="contain">Conter inteira</option><option value="cover">Preencher / recortar</option>
      </select></label>
      {style.imageFit==='cover'&&<>
        <label>Recorte horizontal (%)<input aria-label="Recorte horizontal" type="range" min={0} max={100} value={style.imageX??50} onChange={e=>update('imageX',Number(e.target.value))}/></label>
        <label>Recorte vertical (%)<input aria-label="Recorte vertical" type="range" min={0} max={100} value={style.imageY??50} onChange={e=>update('imageY',Number(e.target.value))}/></label>
      </>}
    </div>}
    <div className="f11-fields">
      {color('background','Cor de fundo','#ffffff')}
      {color('borderColor','Cor da borda','#64748b')}
      <label>Borda (px)<input aria-label="Espessura da borda" type="number" min={0} max={12} value={style.borderWidth??0} onChange={e=>update('borderWidth',Number(e.target.value))}/></label>
      <label>Cantos (px)<input aria-label="Arredondamento" type="number" min={0} max={48} value={style.radius??0} onChange={e=>update('radius',Number(e.target.value))}/></label>
      <label>Opacidade (%)<input aria-label="Opacidade do elemento" type="range" min={10} max={100} value={style.opacity??100} onChange={e=>update('opacity',Number(e.target.value))}/></label>
    </div>
    {message&&<small role="status">{message}</small>}
  </section>
}
