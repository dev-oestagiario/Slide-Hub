import { parseSlides } from '../../lib/slideParser.ts'
import { paginateSlides } from './autoOrganizer.ts'
import { extractSlideBlocks, setBlockRect, splitVisibleBlocks } from './layoutModel.ts'
import type { BlockRect, EditorLayout } from './layoutModel.ts'
export type SourceEdit={markdown:string;layout:EditorLayout;id:string}
export const editableText=(kind:string)=>kind==='heading'||kind==='paragraph'
export const duplicable=(kind:string)=>kind==='paragraph'||kind==='image'
const blocks=(source:string,autoBreak:boolean)=>extractSlideBlocks(paginateSlides(parseSlides(source,autoBreak)))
const signature=(b:{kind:string;markdown:string})=>b.kind+'\u0000'+b.markdown
const answers=(source:string,autoBreak:boolean)=>JSON.stringify(parseSlides(source,autoBreak).filter(s=>s.answer).map(s=>s.answer))
/** Validate against complete parsed visible content. A private-answer occurrence,
 * unsupported syntax, or ambiguous match is never edited by a raw substring replace. */
export function editVisibleBlock(source:string,layout:EditorLayout,id:string,value:string,
  autoBreak:boolean,mode:'edit'|'duplicate',rect?:BlockRect,newId=()=>crypto.randomUUID()):SourceEdit|null{
  const normalized=source.replace(/\r\n?/g,'\n')
  const current=blocks(normalized,autoBreak)
  const index=layout.blocks.findIndex(b=>b.id===id)
  const block=layout.blocks[index]
  if(!block||layout.overrides[id]?.locked||current.length!==layout.blocks.length||
    current.some((b,i)=>signature(b)!==signature(layout.blocks[i])))return null
  if(mode==='edit'&&!editableText(block.kind)||mode==='duplicate'&&!duplicable(block.kind))return null
  const replacement=mode==='duplicate'?block.markdown:value.trim()
  if(!replacement||replacement.length>50000)return null
  if(mode==='edit'){
    if(replacement===block.markdown)return {markdown:source,layout,id}
    if(/^\s*(?::::|<!--)/m.test(replacement))return null
    const parts=splitVisibleBlocks(replacement)
    if(parts.length!==1||parts[0].kind!==block.kind||parts[0].markdown!==replacement)return null
  }
  const expected=current.map(signature)
  if(mode==='duplicate')expected.splice(index+1,0,signature(block))
  else expected[index]=signature({...block,markdown:replacement})
  const beforeAnswers=answers(normalized,autoBreak)
  const matches:string[]=[]
  let from=0
  for(let offset=normalized.indexOf(block.markdown,from);offset>=0;offset=normalized.indexOf(block.markdown,from)){
    from=offset+Math.max(1,block.markdown.length)
    const end=offset+block.markdown.length
    if((offset>0&&normalized[offset-1]!=='\n')||(end<normalized.length&&normalized[end]!=='\n'))continue
    const candidate=normalized.slice(0,offset)+(mode==='duplicate'?block.markdown+'\n\n'+replacement:replacement)+normalized.slice(end)
    const parsed=blocks(candidate,autoBreak)
    if(parsed.length===expected.length&&parsed.every((b,i)=>signature(b)===expected[i])&&answers(candidate,autoBreak)===beforeAnswers)
      matches.push(candidate)
    if(matches.length>1)return null
  }
  if(matches.length!==1)return null
  const nextBlocks=blocks(matches[0],autoBreak)
  const seed=layout.blocks.map(b=>({...b}))
  let target=id
  if(mode==='duplicate'){
    target=newId()
    if(seed.some(b=>b.id===target))return null
    seed.splice(index+1,0,{...block,id:target})
  }
  const next:EditorLayout={...layout,blocks:nextBlocks.map((b,i)=>({...b,id:seed[i].id})),overrides:{...layout.overrides}}
  // Assign IDs by validated sequence, not similarity, to retain original geometry.
  if(mode==='duplicate'&&(rect||layout.overrides[id])){
    const original=rect??layout.overrides[id]
    const {group,locked,...copy}=original
    return {markdown:matches[0],layout:setBlockRect(next,target,{...copy,x:copy.x+.03,y:copy.y+.03}),id:target}
  }
  return {markdown:matches[0],layout:next,id:target}
}
