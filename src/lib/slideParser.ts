export type SlideTheme = 'dark' | 'light'
export type SlideLayout = 'default' | 'center' | 'split'
export interface Slide {
  id:number
  markdown:string
  answer:string
  theme?:SlideTheme
  layout:SlideLayout
  exercise:boolean
}
const directive=/^<!--\s*slide(?::\s*(.*?))?\s*-->\s*$/i
const options=/([a-z]+)\s*=\s*(dark|light|default|center|split)/g

export function parseSlides(source:string,breakOnH2=true):Slide[]{
  const slides:Slide[]=[]
  let body:string[]=[],answer:string[]=[]
  let theme:SlideTheme|undefined,layout:SlideLayout='default',exercise=false
  let block:'body'|'answer'='body'
  let inFence=false,fenceMark=''
  const flush=()=>{
    const markdown=body.join('\n').trim(), solution=answer.join('\n').trim()
    if(markdown||solution)slides.push({id:slides.length,markdown,answer:solution,theme,layout,exercise})
    body=[];answer=[];theme=undefined;layout='default';exercise=false;block='body'
  }
  for(const line of source.replace(/\r\n?/g,'\n').split('\n')){
    const fence=line.match(/^\s*(`{3,}|~{3,})/)
    if(fence){
      if(!inFence){inFence=true;fenceMark=fence[1]}
      else if(fence[1][0]===fenceMark[0]&&fence[1].length>=fenceMark.length)inFence=false
    }
    if(!inFence&&!fence){
      const directiveMatch=line.match(directive)
      if(directiveMatch){
        flush()
        for(const m of (directiveMatch[1]??'').matchAll(options)){
          if(m[1]==='theme'&&(m[2]==='dark'||m[2]==='light'))theme=m[2]
          if(m[1]==='layout'&&['default','center','split'].includes(m[2]))layout=m[2] as SlideLayout
        }
        continue
      }
      if(breakOnH2&&/^##\s+\S/.test(line)&&body.some(x=>x.trim()))flush()
      if(/^:::answer\s*$/.test(line)){block='answer';continue}
      if(/^:::exercise\s*$/.test(line)){exercise=true;continue}
      if(/^:::\s*$/.test(line)){block='body';continue}
    }
    ;(block==='answer'?answer:body).push(line)
  }
  flush()
  return slides.length?slides:[{id:0,markdown:'# Aula sem conteúdo\nEscreva a primeira seção no editor.',answer:'',layout:'center',exercise:false}]
}
