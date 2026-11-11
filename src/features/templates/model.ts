import { normalizeSlideTheme, THEME_PRESETS } from '../../lib/slideThemes.ts'
import type { SlideTheme } from '../../lib/slideThemes.ts'
import type { Slide, SlideLayout } from '../../lib/slideParser.ts'

export type LayoutRules = { cover: SlideLayout; content: SlideLayout; exercise: SlideLayout }
export type PresentationTemplateConfig = {
  schemaVersion: 1
  theme: SlideTheme
  layouts: LayoutRules
  footer: { text: string; showPageNumber: boolean }
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

const layouts = new Set<SlideLayout>(['default', 'center', 'split'])
const safeLayout = (value: unknown, fallback: SlideLayout): SlideLayout =>
  typeof value === 'string' && layouts.has(value as SlideLayout) ? value as SlideLayout : fallback
const normalizeFooter = (value: unknown) => {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  return {
    text: typeof data.text === 'string' ? data.text.trim().slice(0, 80) : '',
    showPageNumber: data.showPageNumber !== false
  }
}

/** A estrutura antiga de tema continua válida. Nenhum dado de aula precisa ser regravado. */
export function normalizePresentationTemplate(raw: unknown): PresentationTemplateConfig {
  const data = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown> : {}
  const rules = data.layouts && typeof data.layouts === 'object' && !Array.isArray(data.layouts)
    ? data.layouts as Record<string, unknown> : {}
  const themeSource = data.theme ?? (data.background ? data : undefined)
  return {
    schemaVersion: 1,
    theme: normalizeSlideTheme(themeSource),
    layouts: {
      cover: safeLayout(rules.cover, 'center'),
      content: safeLayout(rules.content, 'default'),
      exercise: safeLayout(rules.exercise, 'center')
    },
    footer: normalizeFooter(data.footer)
  }
}

export const BUILTIN_PRESENTATION_TEMPLATES: TemplateChoice[] = THEME_PRESETS.map((preset, index) => ({
  id: 'system:' + preset.id,
  kind: 'builtin',
  name: preset.name,
  description: preset.subtitle,
  revision: 1,
  config: normalizePresentationTemplate({
    theme: preset.theme,
    layouts: {
      cover: index === 2 ? 'default' : 'center',
      content: index === 4 ? 'split' : 'default',
      exercise: 'center'
    },
    footer: { text: '', showPageNumber: true }
  })
}))

export function personalTemplate(record: PresentationTemplateRecord): TemplateChoice {
  return {
    id: record.id,
    kind: 'personal',
    name: record.name,
    description: record.description || '',
    revision: record.revision,
    config: normalizePresentationTemplate(record.config)
  }
}
export function templateChoices(records: PresentationTemplateRecord[]): TemplateChoice[] {
  return [...BUILTIN_PRESENTATION_TEMPLATES, ...records.map(personalTemplate)]
}
export function templateIsApplied(snapshot: unknown): boolean {
  return !!snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
    && Object.keys(snapshot).length > 0
}
export function configFromSnapshot(snapshot: unknown): PresentationTemplateConfig | null {
  return templateIsApplied(snapshot) ? normalizePresentationTemplate(snapshot) : null
}
/** Diretivas explícitas no Markdown prevalecem sobre os presets automáticos. */
export function layoutForSlide(template: PresentationTemplateConfig | null, slide: Slide, index: number): SlideLayout {
  if (!template || slide.layout !== 'default') return slide.layout
  if (slide.exercise) return template.layouts.exercise
  if (index === 0) return template.layouts.cover
  return template.layouts.content
}
export function layoutPresentation(slides: Slide[], template: PresentationTemplateConfig | null): Slide[] {
  if (!template) return slides
  return slides.map((slide, index) => ({ ...slide, layout: layoutForSlide(template, slide, index) }))
}
export function createTemplateSnapshot(config: unknown): PresentationTemplateConfig {
  return normalizePresentationTemplate(config)
}
/** A aplicação de template altera exclusivamente o visual, sem modificar Markdown/notas. */
export function presentationApplyPatch(choice: TemplateChoice) {
  const config = createTemplateSnapshot(choice.config)
  return {
    presentation_template_id: choice.kind === 'personal' ? choice.id : null,
    presentation_template_snapshot: config,
    theme_config: config.theme,
    template_id: null
  }
}
/** Mudança da aparência da aula não reescreve as regras do template nem o conteúdo. */
export function themeOverrideSnapshot(snapshot: unknown, theme: SlideTheme): PresentationTemplateConfig | null {
  if (!templateIsApplied(snapshot)) return null
  return { ...normalizePresentationTemplate(snapshot), theme: normalizeSlideTheme(theme) }
}
