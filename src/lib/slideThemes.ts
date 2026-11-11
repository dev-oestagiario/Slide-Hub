import type { CSSProperties } from 'react'

export type BackgroundMode = 'solid' | 'gradient' | 'image'
export type SlideTheme = {
  background: string
  foreground: string
  accent: string
  backgroundMode: BackgroundMode
  backgroundImage?: string
  backgroundPosition: 'center' | 'top' | 'bottom'
  overlayColor: string
  overlayOpacity: number
  fontFamily: string
}

export const DEFAULT_SLIDE_THEME: SlideTheme = {
  background: '#FAFCFB',
  foreground: '#12544F',
  accent: '#1E7C74',
  backgroundMode: 'solid',
  backgroundPosition: 'center',
  overlayColor: '#0B2625',
  overlayOpacity: 0.48,
  fontFamily: 'Inter, system-ui, sans-serif',
}

const fonts = [
  'Inter, system-ui, sans-serif',
  'Georgia, serif',
  'Arial, sans-serif',
] as const

export const FONT_OPTIONS = [
  { label: 'Moderno — Inter', value: fonts[0] },
  { label: 'Editorial — Georgia', value: fonts[1] },
  { label: 'Clássico — Arial', value: fonts[2] },
] as const

export const THEME_PRESETS: Array<{ id: string; name: string; subtitle: string; theme: SlideTheme }> = [
  { id: 'ice', name: 'Gelo', subtitle: 'Clareza e simplicidade', theme: { ...DEFAULT_SLIDE_THEME } },
  { id: 'teal', name: 'Petróleo', subtitle: 'Contraste marcante', theme: { ...DEFAULT_SLIDE_THEME, background: '#12544F', foreground: '#F4F7F6', accent: '#7FE0D4' } },
  { id: 'sand', name: 'Areia', subtitle: 'Leitura acolhedora', theme: { ...DEFAULT_SLIDE_THEME, background: '#F5EFE1', foreground: '#423629', accent: '#A26E45', fontFamily: 'Georgia, serif' } },
  { id: 'midnight', name: 'Noite', subtitle: 'Aulas com pouca luz', theme: { ...DEFAULT_SLIDE_THEME, background: '#17222F', foreground: '#FAFCFD', accent: '#7FE0D4' } },
  { id: 'aurora', name: 'Aurora', subtitle: 'Gradiente suave', theme: { ...DEFAULT_SLIDE_THEME, background: '#134A57', foreground: '#FFFFFF', accent: '#246C6C', backgroundMode: 'gradient' } },
  { id: 'blue', name: 'Cobalto', subtitle: 'Tecnologia e inovação', theme: { ...DEFAULT_SLIDE_THEME, background: '#EAF0FF', foreground: '#203963', accent: '#395BBD' } },
]

const hexColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : fallback

/** Permite apenas links de mídia do bucket Supabase utilizado pela aplicação. */
export function safeBackgroundUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2000) return undefined
  try {
    const parsed = new URL(value)
    const basePath = '/storage/v1/object/public/slide-theme-backgrounds/'
    const prefix = basePath + ''
    if (
      parsed.protocol !== 'https:' ||
      !parsed.hostname.endsWith('.supabase.co') ||
      !parsed.pathname.startsWith(prefix) ||
      parsed.pathname.length <= prefix.length ||
      parsed.username || parsed.password
    ) return undefined
    return parsed.toString()
  } catch { return undefined }
}

/** Aceita também templates antigos, com apenas três cores. */
export function normalizeSlideTheme(raw: unknown): SlideTheme {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_SLIDE_THEME }
  const v = raw as Record<string, unknown>
  const url = safeBackgroundUrl(v.backgroundImage)
  const backgroundMode: BackgroundMode =
    v.backgroundMode === 'gradient' ? 'gradient'
      : v.backgroundMode === 'image' && url ? 'image'
        : (url && !v.backgroundMode) ? 'image' : 'solid'
  const overlay = typeof v.overlayOpacity === 'number' && Number.isFinite(v.overlayOpacity)
    ? Math.min(0.85, Math.max(0.15, v.overlayOpacity))
    : DEFAULT_SLIDE_THEME.overlayOpacity
  return {
    background: hexColor(v.background, DEFAULT_SLIDE_THEME.background),
    foreground: hexColor(v.foreground, DEFAULT_SLIDE_THEME.foreground),
    accent: hexColor(v.accent, DEFAULT_SLIDE_THEME.accent),
    backgroundMode,
    ...(url ? { backgroundImage: url } : {}),
    backgroundPosition: v.backgroundPosition === 'top' || v.backgroundPosition === 'bottom' ? v.backgroundPosition : 'center',
    overlayColor: hexColor(v.overlayColor, DEFAULT_SLIDE_THEME.overlayColor),
    overlayOpacity: overlay,
    fontFamily: typeof v.fontFamily === 'string' && fonts.includes(v.fontFamily as typeof fonts[number])
      ? v.fontFamily : DEFAULT_SLIDE_THEME.fontFamily,
  }
}

function rgba(hex: string, opacity: number): string {
  const n = hex.replace('#', '')
  return 'rgba(' + [0, 2, 4].map(i => Number.parseInt(n.slice(i, i + 2), 16)).join(',') + ',' + opacity + ')'
}

export function slideBackgroundStyle(theme: SlideTheme): CSSProperties {
  const t = normalizeSlideTheme(theme)
  const url = t.backgroundMode === 'image' ? safeBackgroundUrl(t.backgroundImage) : undefined
  const shade = rgba(t.overlayColor, t.overlayOpacity)
  return {
    backgroundColor: t.background,
    backgroundImage: url
      ? 'linear-gradient(' + shade + ',' + shade + '), url("' + url + '")'
      : t.backgroundMode === 'gradient'
        ? 'linear-gradient(135deg, ' + t.background + ', ' + t.accent + ')'
        : 'none',
    backgroundSize: 'cover',
    backgroundPosition: t.backgroundPosition,
    color: t.foreground,
    fontFamily: t.fontFamily,
  }
}

/** O tema da aula prevalece de modo consistente. Atributos legados de cor no Markdown não quebram a identidade visual. */
export function themeForSlide(theme: SlideTheme, _directive?: 'light' | 'dark'): SlideTheme {
  return theme
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  const linear = channels.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}
export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(hexColor(foreground, '#000000'))
  const b = luminance(hexColor(background, '#FFFFFF'))
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
