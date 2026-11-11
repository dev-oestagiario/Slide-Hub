import type { Slide } from '../../lib/slideParser.ts'

export type BlockKind = 'heading' | 'paragraph' | 'list' | 'image' | 'quote' | 'table' | 'code'
export type SlideBlock = {
  id: string
  kind: BlockKind
  markdown: string
  slideIndex: number
}
export type BlockRect = { x:number; y:number; w:number; h:number; z:number }
export type EditorLayout = { schemaVersion:1; blocks:SlideBlock[]; overrides:Record<string,BlockRect> }
export type EditorSlide = { key:string; blocks:SlideBlock[]; slide:Slide }

export const emptyLayout=():EditorLayout=>({schemaVersion:1,blocks:[],overrides:{}})
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n))
function kind(markdown:string):BlockKind{
  if(/^\s*#{1,6} /m.test(markdown))return 'heading'
  if(/^\s*!\[[^\]]*\]\(/m.test(markdown))return 'image'
  if(/^\s*(?:`{3,}|~{3,})/.test(markdown))return 'code'
  if(/^\s*\|.+\|/m.test(markdown))return 'table'
  if(/^\s*>/.test(markdown))return 'quote'
  if(/^\s*(?:[-*+] |\d+[.)] )/.test(markdown))return 'list'
  return 'paragraph'
}
export function normalizeRect(value:unknown):BlockRect|null{
  const r=object(value)
  const vals=[r.x,r.y,r.w,r.h,r.z]
  if(vals.some(v=>typeof v!=='number'||!Number.isFinite(v)))return null
  const w=clamp(r.w as number,.08,1)
  const h=clamp(r.h as number,.05,1)
  return {x:clamp(r.x as number,0,1-w),y:clamp(r.y as number,0,1-h),w,h,z:Math.round(clamp(r.z as number,0,100))}
}
export function normalizeEditorLayout(raw:unknown):EditorLayout{
  const source=object(raw)
  const blocks:Array<SlideBlock>=[]
  const used=new Set<string>()
  if(Array.isArray(source.blocks))for(const value of source.blocks.slice(0,2000)){
    const b=object(value)
    if(typeof b.id!=='string'||!/^[a-z0-9-]{8,80}$/i.test(b.id)||used.has(b.id))continue
    if(typeof b.markdown!=='string'||b.markdown.length>50000)continue
    if(!Number.isSafeInteger(b.slideIndex)||(b.slideIndex as number)<0)continue
    used.add(b.id)
    blocks.push({id:b.id,kind:kind(b.markdown),markdown:b.markdown,slideIndex:b.slideIndex as number})
  }
  const overrides:Record<string,BlockRect>={}
  for(const [key,value] of Object.entries(object(source.overrides)).slice(0,2000)){
    if(!used.has(key))continue
    const rect=normalizeRect(value)
    if(rect)overrides[key]=rect
  }
  return {schemaVersion:1,blocks,overrides}
}
/** Structural content only. Never includes the private :::answer content removed by parseSlides. */
export function splitVisibleBlocks(markdown:string):Array<{kind:BlockKind;markdown:string}> {
  const lines=markdown.replace(/\r\n?/g,'\n').split('\n')
  const result:string[]=[]
  let part:string[]=[],fence:string|null=null
  const flush=()=>{const value=part.join('\n').trim();if(value)result.push(value);part=[]}
  for(const line of lines){
    const mark=line.match(/^\s*(`{3,}|~{3,})/)
    if(!fence&&mark){flush();part.push(line);fence=mark[1];continue}
    if(fence){
      part.push(line)
      if(mark&&mark[1][0]===fence[0]&&mark[1].length>=fence.length){fence=null;flush()}
      continue
    }
    if(!line.trim()){flush();continue}
    if(/^\s*#{1,6}\s/.test(line)){
      flush();part.push(line);flush();continue
    }
    const currentKind=part.length?kind(part.join('\n')):null
    const nextKind=kind(line)
    if(part.length && (nextKind==='image'||nextKind==='quote'||nextKind==='table'||
       (nextKind==='list'&&currentKind!=='list')||(currentKind==='list'&&nextKind!=='list'))){
      flush()
    }
    part.push(line)
  }
  flush()
  return result.map(value=>({kind:kind(value),markdown:value}))
}
export function extractSlideBlocks(slides:readonly Slide[]):Array<Omit<SlideBlock,'id'>>{
  return slides.flatMap((slide,slideIndex)=>splitVisibleBlocks(slide.markdown).map(b=>({...b,slideIndex})))
}
const signature=(value:string)=>value.trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR')
/** Exact matches first; then same-kind nearest candidates. Existing geometry follows IDs, not indices. */
export function reconcileEditorLayout(
  slides:readonly Slide[],
  raw:unknown,
  newId:()=>string=()=>crypto.randomUUID()
):EditorLayout{
  const previous=normalizeEditorLayout(raw)
  const next=extractSlideBlocks(slides)
  const used=new Set<string>()
  const assigned:Array<SlideBlock|undefined>=new Array(next.length)
  const exact=new Map<string,SlideBlock[]>()
  for(const b of previous.blocks){
    const token=b.kind+'|'+signature(b.markdown)
    const matches=exact.get(token)||[]
    matches.push(b);exact.set(token,matches)
  }
  next.forEach((block,index)=>{
    const matches=exact.get(block.kind+'|'+signature(block.markdown))||[]
    const match=matches.find(candidate=>!used.has(candidate.id))
    if(match){assigned[index]={...block,id:match.id};used.add(match.id)}
  })
  // A new paragraph should never inherit a saved position just because it appears
  // near an old paragraph. Match changed content by similarity first.
  const terms=(text:string)=>new Set(signature(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean))
  const similarity=(left:string,right:string)=>{
    const a=terms(left),b=terms(right)
    if(!a.size||!b.size)return 0
    let shared=0
    for(const token of a)if(b.has(token))shared++
    return shared/Math.max(a.size,b.size)
  }
  for(const [index,block] of next.entries()){
    if(assigned[index])continue
    const remaining=previous.blocks.map((candidate,oldIndex)=>({candidate,oldIndex}))
      .filter(item=>!used.has(item.candidate.id)&&item.candidate.kind===block.kind)
    const unmatchedNew=next.filter((other,i)=>!assigned[i]&&other.kind===block.kind).length
    const ranked=remaining.map(item=>({
      ...item,similarity:similarity(item.candidate.markdown,block.markdown),
      distance:Math.abs(item.oldIndex-index)+Math.abs(item.candidate.slideIndex-block.slideIndex)*.25
    })).sort((a,b)=>b.similarity-a.similarity||a.distance-b.distance)
    const best=ranked[0]
    const uniqueRename=remaining.length===1&&unmatchedNew===1&&best?.distance<=2
    if(best&&(best.similarity>=.4||uniqueRename)){
      assigned[index]={...block,id:best.candidate.id};used.add(best.candidate.id)
    }
  }
  const blocks=next.map((block,index)=>{
    if(assigned[index])return assigned[index] as SlideBlock
    let id=newId()
    while(used.has(id))id=newId()
    used.add(id)
    return {...block,id}
  })
  const overrides:Record<string,BlockRect>={}
  for(const block of blocks)if(previous.overrides[block.id])overrides[block.id]=previous.overrides[block.id]
  return {schemaVersion:1,blocks,overrides}
}
export function editorSlides(slides:readonly Slide[],layout:EditorLayout):EditorSlide[]{
  const byIndex=new Map<number,SlideBlock[]>()
  for(const block of layout.blocks){
    const collection=byIndex.get(block.slideIndex)||[]
    collection.push(block);byIndex.set(block.slideIndex,collection)
  }
  return slides.map((slide,index)=>{
    const blocks=byIndex.get(index)||[]
    return {key:blocks[0]?.id??'empty-'+index,slide,blocks}
  })
}
export function setBlockRect(layout:EditorLayout,id:string,rect:unknown):EditorLayout {
  if(!layout.blocks.some(block=>block.id===id))return layout
  const normalized=normalizeRect(rect)
  if(!normalized)return layout
  return {...layout,overrides:{...layout.overrides,[id]:normalized}}
}
export function resetBlockRect(layout:EditorLayout,id:string):EditorLayout{
  if(!layout.overrides[id])return layout
  const overrides={...layout.overrides}
  delete overrides[id]
  return {...layout,overrides}
}
export function layoutsEqual(a:EditorLayout,b:EditorLayout):boolean{
  if(a.blocks.length!==b.blocks.length)return false
  for(let i=0;i<a.blocks.length;i++){
    const x=a.blocks[i],y=b.blocks[i]
    if(x.id!==y.id||x.kind!==y.kind||x.markdown!==y.markdown||x.slideIndex!==y.slideIndex)return false
  }
  const ak=Object.keys(a.overrides).sort(),bk=Object.keys(b.overrides).sort()
  if(ak.length!==bk.length||ak.some((key,i)=>key!==bk[i]))return false
  return ak.every(key=>{
    const x=a.overrides[key],y=b.overrides[key]
    return x.x===y.x&&x.y===y.y&&x.w===y.w&&x.h===y.h&&x.z===y.z
  })
}
export function overflowing(rect:BlockRect):boolean{return rect.x+rect.w>1.001||rect.y+rect.h>1.001}
export function intersecting(a:BlockRect,b:BlockRect):boolean{
  return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y
}
export function slideCollisions(slide:EditorSlide,layout:EditorLayout):number{
  const rectangles=slide.blocks.map(block=>layout.overrides[block.id]).filter((r):r is BlockRect=>Boolean(r))
  let count=0
  for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){
    if(intersecting(rectangles[i],rectangles[j]))count++
  }
  return count
}
