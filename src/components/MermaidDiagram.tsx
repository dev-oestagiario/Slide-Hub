import { useEffect, useId, useRef, useState } from 'react'
let initialized=false
export function MermaidDiagram({source}:{source:string}){
  const id='diagram-'+useId().replace(/[^a-z0-9]/gi,'')
  const ref=useRef<HTMLDivElement>(null)
  const [error,setError]=useState('')
  useEffect(()=>{
    let active=true
    async function render(){
      try{
        const mermaid=(await import('mermaid')).default
        if(!initialized){mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'neutral'});initialized=true}
        const output=await mermaid.render(id,source)
        if(active&&ref.current){ref.current.innerHTML=output.svg;setError('')}
      }catch(e){if(active)setError(e instanceof Error?e.message:'Diagrama inválido')}
    }
    void render()
    return ()=>{active=false}
  },[id,source])
  return error?<div role="alert">Não foi possível renderizar o Mermaid: {error}</div>:<div ref={ref} className="mermaid-diagram" aria-label="Diagrama Mermaid"/>
}
