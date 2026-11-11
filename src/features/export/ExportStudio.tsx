import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Printer, X } from 'lucide-react'
import { useModalFocus } from '../../lib/useModalFocus'
import type { ExportPlan } from './exportModel'
import { ExportPages } from './ExportPages'
import { EXPORT_STYLES } from './exportStyles'

type Props={plan:ExportPlan; onClose:()=>void}

/** Browser print to PDF and static HTML export use the same visible slide structure. */
export function ExportStudio({plan,onClose}:Props){
  const dialog=useRef<HTMLDivElement>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  useModalFocus(dialog)
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();onClose()}
    }
    document.addEventListener('keydown',key)
    return ()=>document.removeEventListener('keydown',key)
  },[onClose])

  async function downloadHtml(){
    if(busy)return
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
        <button type="button" onClick={()=>void downloadHtml()} disabled={busy}>
          <Download size={17}/> {busy?'Gerando…':'Baixar HTML'}
        </button>
        <button type="button" className="f6-primary" onClick={printSlides}>
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
    <div className="f6-export-view">
      <p className="f6-export-note">Para salvar um PDF, clique em “Imprimir / PDF” e selecione “Salvar como PDF” no navegador.</p>
      <ExportPages plan={plan}/>
    </div>
  </div>,document.body)
}
