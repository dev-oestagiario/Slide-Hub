import type { Slide } from '../../lib/slideParser.ts'
import { splitVisibleBlocks } from './layoutModel.ts'
import type { BlockKind } from './layoutModel.ts'

export type FlowSlide = Slide & { continuation?: boolean; originalIndex?: number }
export type FlowPiece = { markdown:string; kind:BlockKind; units:number }

export const DEFAULT_FLOW_BUDGET = 10.5
const plainLength=(s:string)=>s.replace(/!\[[^\]]*\]\([^)]+\)/g,'imagem')
  .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
  .replace(/[#*_~>|]/g,'').trim().length

/** Estimates occupancy on a 16:9 slide. Browser auto-fit is the final authority. */
export function estimatePiece(kind:BlockKind,markdown:string):number{
  const lines=markdown.split('\n')
  const chars=plainLength(markdown)
  if(kind==='heading')return 1.75+Math.max(0,Math.ceil(chars/45)-1)*1.15
  if(kind==='image')return 6.1
  if(kind==='list')return 0.7+lines.filter(x=>/^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(x)).length*1.02
  if(kind==='table')return 2.0+lines.length*.83
  if(kind==='code')return 2.1+lines.length*.62
  if(kind==='quote')return 1.3+Math.ceil(chars/65)*.8
  return .75+Math.ceil(chars/62)*.7+Math.max(0,lines.length-1)*.4
}

/** Keep lists readable by breaking between items; never alter image URLs or code fences. */
export function flowPieces(markdown:string):FlowPiece[]{
  const result:FlowPiece[]=[]
  for(const block of splitVisibleBlocks(markdown)){
    if(block.kind==='list'){
      const lines=block.markdown.split('\n')
      let group:string[]=[]
      const flush=()=>{
        if(!group.length)return
        const text=group.join('\n')
        result.push({markdown:text,kind:'list',units:estimatePiece('list',text)})
        group=[]
      }
      for(const line of lines){
        if(group.length>=5 && /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(line))flush()
        group.push(line)
      }
      flush()
    }else{
      result.push({...block,units:estimatePiece(block.kind,block.markdown)})
    }
  }
  return result
}

/**
 * Deterministic, non-destructive pagination. An explicit slide is a lower bound,
 * not a guarantee that unlimited content fits. Answer keys remain on the last
 * resulting page and are never added to the rendered Markdown.
 */
export function paginateSlides(slides:readonly Slide[],budget=DEFAULT_FLOW_BUDGET):FlowSlide[]{
  const result:FlowSlide[]=[]
  const maxUnits=Math.min(24,Math.max(4,budget))
  for(const [originalIndex,slide] of slides.entries()){
    const pieces=flowPieces(slide.markdown)
    if(!pieces.length){result.push({...slide,id:result.length,originalIndex});continue}
    const groups:FlowPiece[][]=[]
    let current:FlowPiece[]=[],used=0
    const push=()=>{
      if(current.length)groups.push(current)
      current=[];used=0
    }
    for(const piece of pieces){
      const need=used+piece.units
      if(current.length && need>maxUnits){
        if(current[current.length-1]?.kind==='heading' && current.length>1){
          const heading=current.pop()!
          push()
          current=[heading];used=heading.units
        }else if(current.length===1 && current[0].kind==='heading'){
          // Keep a single large image/code block with its heading; auto-fit constrains it.
        }else push()
      }
      current.push(piece)
      used+=piece.units
    }
    push()
    groups.forEach((group,pageIndex)=>{
      result.push({
        ...slide,id:result.length,
        markdown:group.map(piece=>piece.markdown).join('\n\n'),
        answer:pageIndex===groups.length-1?slide.answer:'',
        exercise:pageIndex===0?slide.exercise:false,
        continuation:pageIndex>0,originalIndex
      })
    })
  }
  return result
}
