import { useState } from 'react'
import type { SlideBlock } from './layoutModel'
export function InlineBlockEdit({block,onSave,onCancel}:{block:SlideBlock;onSave:(value:string)=>boolean;onCancel:()=>void}){
  const heading=block.kind==='heading'?block.markdown.match(/^(#{1,6}\s+)/)?.[1]??'':''
  const [draft,setDraft]=useState(block.markdown.slice(heading.length))
  const [error,setError]=useState(false)
  const submit=()=>{if(onSave(heading+draft.trim()))onCancel();else setError(true)}
  return <div className="f11-inline-edit" role="group" aria-label="Editar texto no slide"
    onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onCancel()}
      if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();submit()}
    }}>
    <label htmlFor={'inline-'+block.id}>{block.kind==='heading'?'Editar título':'Editar parágrafo'}</label>
    <textarea id={'inline-'+block.id} aria-label="Texto do elemento" autoFocus value={draft}
      onChange={e=>{setDraft(e.target.value);setError(false)}} rows={3}/>
    {error&&<small role="alert">Edite este bloco pelo painel Escrever para preservar a estrutura.</small>}
    <div><button type="button" onClick={onCancel}>Cancelar</button><button type="button" onClick={submit}>Aplicar texto</button></div>
  </div>
}
