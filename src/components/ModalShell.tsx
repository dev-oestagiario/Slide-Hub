import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useModalFocus } from '../lib/useModalFocus'

type Props = {
  children:ReactNode
  label:string
  onClose:()=>void
}

/** Keep the template editor keyboard-accessible while preserving the underlying draft. */
export function ModalShell({children,label,onClose}:Props){
  const dialog=useRef<HTMLDivElement>(null)
  useModalFocus(dialog)
  useEffect(()=>{
    const close=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();onClose()}
    }
    document.addEventListener('keydown',close)
    return ()=>document.removeEventListener('keydown',close)
  },[onClose])
  return <div className="f2-overlay" onMouseDown={event=>{
    if(event.target===event.currentTarget)onClose()
  }}>
    <div ref={dialog} tabIndex={-1} data-modal-autofocus className="f2-overlay-dialog"
      role="dialog" aria-modal="true" aria-label={label}>
      {children}
    </div>
  </div>
}
