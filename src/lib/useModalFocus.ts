import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const focusable='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Trap keyboard focus inside a modal and restore it to the invoking control on close. */
export function useModalFocus(dialog:RefObject<HTMLElement|null>, enabled=true){
  const previous=useRef<HTMLElement|null>(null)
  useEffect(()=>{
    if(!enabled||!dialog.current)return
    const element=dialog.current
    previous.current=document.activeElement instanceof HTMLElement?document.activeElement:null
    const getFocusables=()=>Array.from(element.querySelectorAll<HTMLElement>(focusable))
      .filter(item=>item.getClientRects().length>0 && item.getAttribute('aria-hidden')!=='true')
    const initial=element.querySelector<HTMLElement>('[data-modal-autofocus]')??getFocusables()[0]??element
    initial.focus()
    const onTab=(event:KeyboardEvent)=>{
      if(event.key!=='Tab')return
      const items=getFocusables()
      if(!items.length){event.preventDefault();element.focus();return}
      const first=items[0],last=items[items.length-1]
      const active=document.activeElement
      if(event.shiftKey&&(active===first||!element.contains(active))){
        event.preventDefault();last.focus()
      }else if(!event.shiftKey&&(active===last||!element.contains(active))){
        event.preventDefault();first.focus()
      }
    }
    document.addEventListener('keydown',onTab,true)
    return ()=>{
      document.removeEventListener('keydown',onTab,true)
      if(previous.current?.isConnected)previous.current.focus()
    }
  },[dialog,enabled])
}
