import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Printer, X } from 'lucide-react'
import { useModalFocus } from '../../lib/useModalFocus'
import type { ExportPlan } from './exportModel'
import { ExportPages } from './ExportPages'
import { exportOverflow } from './exportPreflight'
import { EXPORT_STYLES } from './exportStyles'

type Props={plan:ExportPlan; onClose:()=>void}

/** Browser print to PDF and static HTML export use the same visible slide structure. */
export function ExportStudio({plan,onClose}:Props){
  const dialog=useRef<HTMLDivElement>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [clipped,setClipped]=useState<number[]>([])
  const [accepted,setAccepted]=useState(false)
  const view=useRef<HTMLDivElement>(null)
  useModalFocus(dialog)
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();onClose()}
    }
    document.addEventListener('keydown',key)
    return ()=>document.removeEventListener('keydown',key)
  },[onClose])

  useEffect(()=>{
    const root=view.current
    if(!root)return
    let frame=0
    const check=()=>{frame=0;const next=exportOverflow(root);setClipped(old=>old.join(',')===next.join(',')?old:next)}
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(check)}
    const observer=new ResizeObserver(schedule)
    observer.observe(root);root.querySelectorAll('.f6-page,.f6-page-content,.f6-manual-block').forEach(node=>observer.observe(node))
    root.addEventListener('load',schedule,true);schedule()
    return ()=>{observer.disconnect();root.removeEventListener('load',schedule,true);if(frame)cancelAnimationFrame(frame)}
  },[plan])
  useEffect(()=>setAccepted(false),[clipped.join(',')])
  const preflight=()=>{
    const found=view.current?exportOverflow(view.current):[]
    if(found.length&&(!accepted||found.join(',')!==clipped.join(','))){setClipped(found);setAccepted(false);setError('Revise os slides com conteúdo excedente antes de exportar.');return false}
    return true
  }
  async function downloadHtml(){
    if(busy||!preflight())return
    setBusy(true);setError('')
    try{
      // Dynamic import keeps the browser-side server renderer out of normal editing.
      const {renderStandaloneHtml}=await import('./renderStandaloneHtml')
      const content=renderStandaloneHtml(plan)
      const blob=new Blob([content],{type:'text/html;charset=utf-8'})
      const url=URL.createObjectURL(blob)
      const link=document.createElement('a')
      link.href=url
      link.download=plan.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(()=>URL.revokeObjectURL(url),1000)
    }catch(err){
      setError(err instanceof Error?err.message:'Falha ao gerar a apresentação HTML.')
    }finally{setBusy(false)}
  }
  function printSlides(){
    if(!preflight())return
    setError('')
    try{window.print()}
    catch{setError('Não foi possível abrir a impressão neste navegador.')}
  }

  return createPortal(<div ref={dialog} tabIndex={-1} data-modal-autofocus
    className="f6-export-root" role="dialog" aria-modal="true"
    aria-label={'Exportar apresentação: '+plan.title}>
    <style>{EXPORT_STYLES}</style>
    <header className="f6-export-toolbar">
      <div><h2>Exportar apresentação</h2>
        <p>{plan.pages.length} {plan.pages.length===1?'slide':'slides'} • Formato 16:9 • Sem notas privadas ou gabaritos</p>
      </div>
      <div className="f6-export-actions">
        <button type="button" onClick={()=>void downloadHtml()} disabled={busy||(clipped.length>0&&!accepted)}>
          <Download size={17}/> {busy?'Gerando…':'Baixar HTML'}
        </button>
        <button type="button" className="f6-primary" disabled={clipped.length>0&&!accepted} onClick={printSlides}>
          <Printer size={17}/> Imprimir / PDF
        </button>
        <button type="button" onClick={onClose} aria-label="Fechar exportação">
          <X size={18}/>
        </button>
      </div>
    </header>
    {(plan.externalImages.length>0||plan.mermaidCount>0)&&<div className="f6-export-warnings" role="note">
      {plan.externalImages.length>0&&<span>{plan.externalImages.length} imagem(ns) externa(s) requerem internet no HTML baixado. </span>}
      {plan.mermaidCount>0&&<span>{plan.mermaidCount} diagrama(s) Mermaid são exportados como código, não como gráficos. </span>}
    </div>}
    {error&&<div role="alert" className="f6-export-warnings">{error}</div>}
    {clipped.length>0&&<div className="f6-export-warnings" role="note">
      <strong>Possível corte de conteúdo nos slides {clipped.join(', ')}.</strong> Volte ao editor e ajuste os blocos ou o texto.
      <label className="f15-export-confirm"><input type="checkbox" checked={accepted} onChange={event=>setAccepted(event.target.checked)}/> Exportar mesmo com risco de corte</label>
    </div>}
    <div ref={view} className="f6-export-view">
      <p className="f6-export-note">Para salvar um PDF, clique em “Imprimir / PDF” e selecione “Salvar como PDF” no navegador.</p>
      <ExportPages plan={plan}/>
    </div>
  </div>,document.body)
}
