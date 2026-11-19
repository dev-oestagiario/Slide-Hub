import { parseSlides } from '../../lib/slideParser.ts'
import { paginateSlides } from './autoOrganizer.ts'
import { extractSlideBlocks, splitVisibleBlocks } from './layoutModel.ts'
import type { EditorLayout,SlideBlock } from './layoutModel.ts'

export const SHAPES=['rectangle','rounded','circle','triangle','diamond','line','arrow','check','star','info'] as const
export type ShapeKind=typeof SHAPES[number]
export const validShape=(value:string):value is ShapeKind=>(SHAPES as readonly string[]).includes(value)
export const shapeMarkdown=(shape:ShapeKind)=>String.fromCharCode(96).repeat(3)+'slide-shape\n'+shape+'\n'+String.fromCharCode(96).repeat(3)
export type SlideOperation={type:'move';direction:-1|1}|{type:'duplicate'}|{type:'shape';shape:ShapeKind}
export type SlideChange={markdown:string;layout:EditorLayout;page:number}
const fp=(s:ReturnType<typeof parseSlides>[number])=>JSON.stringify([s.markdown,s.answer,s.theme,s.layout,s.exercise])
const sig=(b:{kind:string;markdown:string})=>b.kind+'\u0000'+b.markdown
/** Split only at the same source boundaries as the parser. Never split inside private answers or fences. */
function segments(source:string,autoBreak:boolean):string[]|null{
  if(!source.trim())return null
  const result:string[]=[],lines=source.replace(/\r\n?/g,'\n').split('\n')
  let part:string[]=[],hasBody=false,hasAnswer=false,privateAnswer=false,fence=''
  const flush=()=>{if(hasBody||hasAnswer)result.push(part.join('\n').trim());else if(part.some(x=>x.trim()))return false;part=[];hasBody=false;hasAnswer=false;privateAnswer=false;return true}
  for(const line of lines){
    const mark=line.match(/^\s*(\x60{3,}|~{3,})/)
    if(mark){if(!fence)fence=mark[1];else if(mark[1][0]===fence[0]&&mark[1].length>=fence.length)fence=''}
    if(!fence&&!mark){
      if(privateAnswer){part.push(line);if(/^:::\s*$/.test(line))privateAnswer=false;else if(line.trim())hasAnswer=true;continue}
      if(/^<!--\s*slide(?::\s*.*?)?\s*-->\s*$/i.test(line)){
        if(hasBody||hasAnswer){if(!flush())return null}
        part.push(line);continue
      }
      if(autoBreak&&/^##\s+\S/.test(line)&&hasBody){if(!flush())return null}
      if(/^:::answer\s*$/.test(line)){privateAnswer=true;part.push(line);continue}
      if(/^:::exercise\s*$/.test(line)||/^:::\s*$/.test(line)){part.push(line);continue}
    }
    part.push(line)
    if(line.trim()){if(privateAnswer)hasAnswer=true;else hasBody=true}
  }
  if(fence||privateAnswer||!flush())return null
  const parsed=parseSlides(source,autoBreak)
  if(result.length!==parsed.length||result.some((s,i)=>{const p=parseSlides(s,autoBreak);return p.length!==1||fp(p[0])!==fp(parsed[i])}))return null
  return result
}
/** Change complete source sections, not their generated continuation pages. Verify round-trip
 * before assigning any IDs; copy answer markup with a duplicated section, never speaker notes. */
export function changeSlide(source:string,layout:EditorLayout,page:number,autoBreak:boolean,
  op:SlideOperation,newId=()=>crypto.randomUUID()):SlideChange|null{
  const original=parseSlides(source,autoBreak),flow=paginateSlides(original)
  const index=flow[page]?.originalIndex
  if(index===undefined)return null
  const raw=segments(source,autoBreak)
  if(!raw)return null
  const old=extractSlideBlocks(flow)
  if(old.length!==layout.blocks.length||old.some((b,i)=>sig(b)!==sig(layout.blocks[i])))return null
  const assigned=raw.map((_,i)=>({raw:raw[i],original:i,copy:false,shape:null as ShapeKind|null}))
  let destination=index
  if(op.type==='move'){
    destination=index+op.direction
    if(destination<0||destination>=raw.length)return null
    const [entry]=assigned.splice(index,1);assigned.splice(destination,0,entry)
  }else if(op.type==='duplicate'){
    destination=index+1;assigned.splice(destination,0,{...assigned[index],copy:true})
  }else{
    if(!validShape(op.shape))return null
    assigned[index]={...assigned[index],raw:raw[index]+'\n\n'+shapeMarkdown(op.shape),shape:op.shape}
  }
  const markdown=assigned.map(entry=>entry.raw).join('\n\n<!-- slide -->\n\n')
  const nextOriginal=parseSlides(markdown,autoBreak)
  if(nextOriginal.length!==assigned.length||nextOriginal.some((s,i)=>{
    const entry=assigned[i],expected=original[entry.original]
    if(!entry.shape)return fp(s)!==fp(expected)
    return fp({...s,markdown:''})!==fp({...expected,markdown:''})||
      JSON.stringify(splitVisibleBlocks(s.markdown))!==JSON.stringify([...splitVisibleBlocks(expected.markdown),{kind:'code',markdown:shapeMarkdown(entry.shape)}])
  }))return null
  const nextFlow=paginateSlides(nextOriginal)
  const nextBlocks=extractSlideBlocks(nextFlow)
  const ids=new Set(layout.blocks.map(b=>b.id)),overrides:EditorLayout['overrides']={}
  const blocks:SlideBlock[]=[]
  let targetPage=nextFlow.findIndex(s=>s.originalIndex===destination)
  for(let i=0;i<assigned.length;i++){
    const entry=assigned[i]
    const previous=layout.blocks.filter(b=>flow[b.slideIndex]?.originalIndex===entry.original)
    const updated=nextBlocks.filter(b=>nextFlow[b.slideIndex]?.originalIndex===i)
    if(updated.length!==previous.length+(entry.shape?1:0))return null
    for(let j=0;j<updated.length;j++){
      const b=updated[j],prior=previous[j]
      if(prior&&sig(prior)!==sig(b))return null
      if(!prior&&(!entry.shape||b.markdown!==shapeMarkdown(entry.shape)))return null
      const id=prior&&!entry.copy?prior.id:newId()
      if((!prior||entry.copy)&&ids.has(id))return null
      ids.add(id);blocks.push({...b,id})
      const rect=prior&&layout.overrides[prior.id]
      if(rect){
        if(entry.copy){const {group,...rest}=rect;overrides[id]=rest}
        else overrides[id]=rect
      }
      if(!prior&&entry.shape)targetPage=b.slideIndex
    }
  }
  return {markdown,layout:{schemaVersion:1,blocks,overrides},page:Math.max(0,targetPage)}
}
