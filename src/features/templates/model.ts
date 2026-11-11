import { normalizeSlideTheme, safeBackgroundUrl, THEME_PRESETS } from '../../lib/slideThemes.ts'
import type { SlideTheme } from '../../lib/slideThemes.ts'
import type { Slide, SlideLayout } from '../../lib/slideParser.ts'

export type SlideKind = 'cover' | 'content' | 'list' | 'quote' | 'image' | 'comparison' | 'exercise' | 'closing'
export const SLIDE_KINDS: readonly SlideKind[] = ['cover','content','list','quote','image','comparison','exercise','closing'] as const
export type LayoutRules = Record<SlideKind, SlideLayout>
export type TemplateDensity = 'comfortable' | 'balanced' | 'compact'
export type BrandingConfig = {
  showHeader: boolean
  label: string
  logoUrl?: string
  logoAlignment: 'left' | 'right'
  accentRule: boolean
}
export type CoverConfig = { backgroundImage?: string; overlayOpacity: number }
export type PresentationTemplateConfig = {
  schemaVersion: 2
  theme: SlideTheme
  layouts: LayoutRules
  footer: { text: string; showPageNumber: boolean }
  branding: BrandingConfig
  density: TemplateDensity
  cover: CoverConfig
}
export type PresentationTemplateRecord = {
  id: string
  owner_id: string
  name: string
  description: string
  config: unknown
  revision: number
  created_at?: string
  updated_at?: string
}
export type TemplateChoice = {
  id: string
  kind: 'builtin' | 'personal'
  name: string
  description: string
  revision: number
  config: PresentationTemplateConfig
}
const acceptedLayouts = new Set<SlideLayout>(['default','center','split'])
const safeLayout = (value: unknown, fallback: SlideLayout): SlideLayout =>
  typeof value === 'string' && acceptedLayouts.has(value as SlideLayout) ? value as SlideLayout : fallback
const defaultLayouts: LayoutRules = {
  cover:'center', content:'default', list:'default', quote:'center',
  image:'split', comparison:'default', exercise:'center', closing:'center'
}
function plainObject(raw: unknown): Record<string,unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
}
const shortText = (raw: unknown, limit: number) => typeof raw === 'string' ? raw.trim().slice(0,limit) : ''
const safeOpacity = (raw: unknown) => typeof raw === 'number' && Number.isFinite(raw)
  ? Math.max(.15,Math.min(.85,raw)) : .48

/** Normalize untrusted JSON and old F2 snapshots without modifying original rows. */
export function normalizePresentationTemplate(raw: unknown): PresentationTemplateConfig {
  const data=plainObject(raw)
  const rules=plainObject(data.layouts)
  const footer=plainObject(data.footer)
  const branding=plainObject(data.branding)
  const cover=plainObject(data.cover)
  const themeSource=data.theme ?? (data.background ? data : undefined)
  const logo=safeBackgroundUrl(branding.logoUrl)
  const coverImage=safeBackgroundUrl(cover.backgroundImage)
  const density: TemplateDensity = data.density==='compact'||data.density==='comfortable'
    ? data.density : 'balanced'
  const layouts={...defaultLayouts}
  for(const kind of SLIDE_KINDS)layouts[kind]=safeLayout(rules[kind],defaultLayouts[kind])
  return {
    schemaVersion:2,
    theme:normalizeSlideTheme(themeSource),
    layouts,
    footer:{text:shortText(footer.text,80),showPageNumber:footer.showPageNumber!==false},
    branding:{
      showHeader:branding.showHeader===true,
      label:shortText(branding.label,50),
      ...(logo ? {logoUrl:logo} : {}),
      logoAlignment:branding.logoAlignment==='right'?'right':'left',
      accentRule:branding.accentRule===true
    },
    density,
    cover:{...(coverImage ? {backgroundImage:coverImage} : {}),overlayOpacity:safeOpacity(cover.overlayOpacity)}
  }
}
export const BUILTIN_PRESENTATION_TEMPLATES: TemplateChoice[] = THEME_PRESETS.map((preset,index)=>({
  id:'system:'+preset.id,kind:'builtin',name:preset.name,description:preset.subtitle,revision:1,
  config:normalizePresentationTemplate({
    theme:preset.theme,layouts:{
      cover:index===2?'default':'center',
      content:index===4?'split':'default',
      exercise:'center'
    },branding:{showHeader:true,label:'SLIDEHUB / AULA',accentRule:index!==0},
    footer:{text:'',showPageNumber:true}
  })
}))
export function personalTemplate(record: PresentationTemplateRecord): TemplateChoice {
  return {id:record.id,kind:'personal',name:record.name,description:record.description||'',revision:record.revision,
    config:normalizePresentationTemplate(record.config)}
}
export const templateChoices=(records:PresentationTemplateRecord[]):TemplateChoice[] =>
  [...BUILTIN_PRESENTATION_TEMPLATES,...records.map(personalTemplate)]
export const templateIsApplied=(snapshot:unknown):boolean=>Object.keys(plainObject(snapshot)).length>0
export const configFromSnapshot=(snapshot:unknown):PresentationTemplateConfig|null=>
  templateIsApplied(snapshot)?normalizePresentationTemplate(snapshot):null

/** Structural rules only, with explicit user directives taking precedence. */
export function inferSlideKind(slide: Slide, index: number): SlideKind {
  if(slide.exercise)return 'exercise'
  const markdown=slide.markdown
  const firstHeading=(markdown.match(/^\s*#{1,3}\s+(.+)$/m)?.[1]||'').toLocaleLowerCase('pt-BR')
  if(/^(conclus[aã]o|considera[cç][oõ]es finais|obrigad[oa]s?|encerramento|at[eé] a pr[oó]xima|resumo final)\b/.test(firstHeading))return 'closing'
  if(index===0)return 'cover'
  if(/^\s*!\[[^\]]*\]\(https?:\/\//m.test(markdown))return 'image'
  if(/^\s*\|.+\|\s*$/m.test(markdown)&&/^\s*\|[\s:|-]+\|\s*$/m.test(markdown))return 'comparison'
  if(/^\s*>\s+\S/m.test(markdown))return 'quote'
  if((markdown.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/gm)||[]).length>=2)return 'list'
  return 'content'
}
export function layoutForSlide(template:PresentationTemplateConfig|null,slide:Slide,index:number):SlideLayout{
  if(!template||slide.layout!=='default')return slide.layout
  return template.layouts[inferSlideKind(slide,index)]
}
export function layoutPresentation(slides:Slide[],template:PresentationTemplateConfig|null):Slide[]{
  if(!template)return slides
  return slides.map((slide,index)=>({...slide,layout:layoutForSlide(template,slide,index)}))
}
/** Cover-only artwork: optional alternative background; other slides keep global theme. */
export function visualThemeForSlide(template:PresentationTemplateConfig|null,theme:SlideTheme,kind:SlideKind):SlideTheme{
  const url=kind==='cover'&&template?.cover.backgroundImage
  return url?normalizeSlideTheme({...theme,backgroundMode:'image',backgroundImage:url,
    overlayOpacity:template.cover.overlayOpacity}):theme
}
export const createTemplateSnapshot=(raw:unknown):PresentationTemplateConfig=>normalizePresentationTemplate(raw)
export function presentationApplyPatch(choice:TemplateChoice){
  const config=createTemplateSnapshot(choice.config)
  return {presentation_template_id:choice.kind==='personal'?choice.id:null,
    presentation_template_snapshot:config,theme_config:config.theme,template_id:null}
}
export function themeOverrideSnapshot(snapshot:unknown,theme:SlideTheme):PresentationTemplateConfig|null{
  return templateIsApplied(snapshot)
    ?{...normalizePresentationTemplate(snapshot),theme:normalizeSlideTheme(theme)}:null
}
