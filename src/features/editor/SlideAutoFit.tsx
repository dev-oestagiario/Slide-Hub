import { useLayoutEffect, useRef, useState } from 'react'
import { MarkdownView } from '../../components/MarkdownView'
import type { SlideLayout } from '../../lib/slideParser'

type Props={markdown:string;layout:SlideLayout}
/**
 * Measures real rendered content (including asynchronous image loads) against
 * the actual 16:9 viewport. First pages are split semantically by autoOrganizer;
 * the remaining excess is shrunk to fit without changing source Markdown.
 */
export function SlideAutoFit({markdown,layout}:Props){
  const outer=useRef<HTMLDivElement>(null)
  const content=useRef<HTMLDivElement>(null)
  const [tooDense,setTooDense]=useState(false)
  const [percent,setPercent]=useState(100)
  useLayoutEffect(()=>{
    const frame=outer.current,inner=content.current
    if(!frame||!inner)return
    let scheduled=0
    const measure=()=>{
      scheduled=0
      inner.style.transform='none'
      const available=Math.max(1,frame.clientHeight-4)
      const actual=Math.max(inner.scrollHeight,1)
      const needed=Math.min(1,available/actual)
      const fit=Math.max(.68,needed)
      inner.style.transform='scale('+fit+')'
      const limited=needed<.68
      frame.classList.toggle('f7-too-dense',limited)
      setTooDense(v=>v===limited?v:limited)
      const next=Math.round(fit*100)
      setPercent(v=>v===next?v:next)
    }
    const schedule=()=>{
      if(!scheduled)scheduled=requestAnimationFrame(measure)
    }
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null
    observer?.observe(frame)
    observer?.observe(inner)
    const imageLoad=()=>schedule()
    inner.addEventListener('load',imageLoad,true)
    // Mermaid and other async rendered content can change intrinsic height.
    const mutations=typeof MutationObserver!=='undefined'
      ?new MutationObserver(schedule):null
    mutations?.observe(inner,{childList:true,subtree:true,characterData:true})
    schedule()
    return ()=>{
      if(scheduled)cancelAnimationFrame(scheduled)
      observer?.disconnect()
      mutations?.disconnect()
      inner.removeEventListener('load',imageLoad,true)
    }
  },[markdown,layout])

  return <div className="f7-autofit" ref={outer}
    aria-label={'Slide organizado automaticamente'+(percent<100?' em '+percent+'%':'')}>
    <div ref={content} className={'f7-autofit-content f7-layout-'+layout}>
      <MarkdownView markdown={markdown}/>
    </div>
    {tooDense&&<span className="f7-autofit-warning" role="status">
      Conteúdo muito extenso: role aqui ou divida o bloco
    </span>}
  </div>
}
