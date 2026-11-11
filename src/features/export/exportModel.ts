import type { Slide, SlideLayout } from '../../lib/slideParser.ts'
import { normalizeSlideTheme, themeForSlide } from '../../lib/slideThemes.ts'
import type { SlideTheme } from '../../lib/slideThemes.ts'
import type { EditorLayout, BlockKind, BlockRect } from '../editor/layoutModel.ts'
import { editorSlides } from '../editor/layoutModel.ts'
import type { PresentationTemplateConfig } from '../templates/model.ts'
import { inferSlideKind, visualThemeForSlide } from '../templates/model.ts'

export type ExportBlock = {
  kind: BlockKind
  markdown: string
  rect: BlockRect | null
}
export type ExportPage = {
  index: number
  markdown: string
  layout: SlideLayout
  theme: SlideTheme
  blocks: ExportBlock[]
  manuallyArranged: boolean
}
export type ExportBrand = {
  header: string
  logo?: string
  align: 'left' | 'right'
  accentRule: boolean
  footer: string
  pageNumber: boolean
}
export type ExportPlan = {
  title: string
  filename: string
  pages: ExportPage[]
  brand: ExportBrand
  externalImages: string[]
  mermaidCount: number
}

/** The export plan must never carry Slide.answer, speaker notes or user credentials. */
export function buildExportPlan(args:{
  title:string
  slides:readonly Slide[]
  theme:SlideTheme
  template?:PresentationTemplateConfig|null
  editorLayout?:EditorLayout|null
}):ExportPlan{
  const {title,slides,template,editorLayout}=args
  const blocks=editorLayout ? editorSlides(slides,editorLayout):[]
  const pages:ExportPage[]=slides.map((slide,index)=>{
    const theme=visualThemeForSlide(
      template??null,themeForSlide(normalizeSlideTheme(args.theme),slide.theme),inferSlideKind(slide,index)
    )
    const mapped=blocks[index]?.blocks.map(block=>({
      kind:block.kind,
      markdown:block.markdown,
      rect:editorLayout?.overrides[block.id]??null
    }))??[]
    return {
      index,markdown:slide.markdown,layout:slide.layout,theme,
      blocks:mapped,manuallyArranged:mapped.some(block=>block.rect!==null)
    }
  })
  const brand:ExportBrand={
    header:template?.branding.showHeader?template.branding.label:'',
    ...(template?.branding.logoUrl?{logo:template.branding.logoUrl}:{}),
    align:template?.branding.logoAlignment==='right'?'right':'left',
    accentRule:Boolean(template?.branding.accentRule),
    footer:template?.footer.text??'',
    pageNumber:template?.footer.showPageNumber!==false
  }
  const images=new Set<string>()
  for(const page of pages){
    // Warnings are informational; rendering still applies react-markdown's URL filtering.
    const markdown=page.markdown
    for(const match of markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)(?:\s+["'][^"']+["'])?\)/g))images.add(match[1])
    if(page.theme.backgroundImage)images.add(page.theme.backgroundImage)
  }
  if(brand.logo)images.add(brand.logo)
  const mermaidCount=pages.reduce((count,page)=>count+(page.markdown.match(/^```mermaid\s*$/gmi)||[]).length,0)
  const cleanTitle=title.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
    .slice(0,70)||'apresentacao'
  return {title,filename:cleanTitle+'.html',pages,brand,externalImages:[...images],mermaidCount}
}
