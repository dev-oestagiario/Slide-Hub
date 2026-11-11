import { useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ImagePlus, Layers3, Palette, Save, Upload, X } from 'lucide-react'
import { MarkdownView } from './MarkdownView'
import {
  contrastRatio, DEFAULT_SLIDE_THEME, FONT_OPTIONS, normalizeSlideTheme,
  slideBackgroundStyle, THEME_PRESETS,
} from '../lib/slideThemes'
import type { BackgroundMode, SlideTheme } from '../lib/slideThemes'

type SavedTheme = { id: string; name: string; config: unknown }
type Props = {
  initial: SlideTheme
  previewMarkdown: string
  savedThemes: SavedTheme[]
  onClose: () => void
  onApply: (theme: SlideTheme) => Promise<boolean>
  onSavePreset: (name: string, theme: SlideTheme) => Promise<boolean>
  onUploadImage: (file: File) => Promise<string>
}

function ColorField({ label, value, onChange }: {
  label: string; value: string; onChange: (value: string) => void
}) {
  return (
    <label className="theme-color-field">
      <span>{label}</span>
      <div>
        <input type="color" value={value} onChange={e => onChange(e.target.value.toUpperCase())} aria-label={label} />
        <code>{value.toUpperCase()}</code>
      </div>
    </label>
  )
}

export function ThemeStudio({
  initial, previewMarkdown, savedThemes, onClose, onApply, onSavePreset, onUploadImage,
}: Props) {
  const [draft, setDraft] = useState<SlideTheme>(() => normalizeSlideTheme(initial))
  const [name, setName] = useState('')
  const [busy, setBusy] = useState<'apply' | 'save' | 'upload' | null>(null)
  const [feedback, setFeedback] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const closeRef = useRef(onClose)

  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    setDraft(normalizeSlideTheme(initial))
    setFeedback('')
    setName('')
  }, [initial])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.stopPropagation(); closeRef.current() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function update(patch: Partial<SlideTheme>) {
    setDraft(current => normalizeSlideTheme({ ...current, ...patch }))
    setFeedback('')
  }
  function changeMode(mode: BackgroundMode) {
    if (mode === 'image' && !draft.backgroundImage) {
      fileInput.current?.click()
      return
    }
    update({ backgroundMode: mode })
  }
  async function uploadImage(file: File) {
    setBusy('upload')
    setFeedback('')
    try {
      const url = await onUploadImage(file)
      update({ backgroundImage: url, backgroundMode: 'image', foreground: '#FFFFFF', overlayOpacity: 0.5 })
      setFeedback('Imagem enviada. Ajuste a transparência e aplique o tema para salvar.')
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.')
    } finally { setBusy(null) }
  }
  async function applyTheme() {
    setBusy('apply')
    try {
      const succeeded = await onApply(draft)
      if (succeeded) onClose()
      else setFeedback('Não foi possível aplicar o tema. Verifique sua conexão.')
    } finally { setBusy(null) }
  }
  async function savePreset() {
    if (name.trim().length < 2) {
      setFeedback('Dê um nome de pelo menos 2 caracteres ao tema.')
      return
    }
    setBusy('save')
    try {
      const succeeded = await onSavePreset(name.trim(), draft)
      setFeedback(succeeded ? 'Tema guardado em Meus temas.' : 'Não foi possível guardar o tema.')
      if (succeeded) setName('')
    } finally { setBusy(null) }
  }
  const image = draft.backgroundMode === 'image' && Boolean(draft.backgroundImage)
  const contrast = contrastRatio(draft.foreground, draft.background)
  const lowContrast = !image && draft.backgroundMode === 'solid' && contrast < 4.5
  return (
    <div className="theme-overlay" role="presentation" onMouseDown={e => {
      if (e.target === e.currentTarget) onClose()
    }}>
      <section className="theme-studio" role="dialog" aria-modal="true" aria-labelledby="theme-dialog-title">
        <header className="theme-studio-header">
          <div className="theme-studio-title">
            <span className="theme-studio-icon"><Palette size={20}/></span>
            <div><h2 id="theme-dialog-title">Estúdio de temas</h2><p>Escolha o visual uma vez. Ele aparecerá em todos os slides.</p></div>
          </div>
          <button type="button" className="theme-close" aria-label="Fechar editor de temas" onClick={onClose}><X size={19}/></button>
        </header>
        <div className="theme-studio-layout">
          <div className="theme-settings">
            <div className="theme-section-heading"><span>01</span><h3>Escolha um estilo</h3></div>
            <div className="theme-preset-grid" role="group" aria-label="Temas prontos">
              {THEME_PRESETS.map(preset => {
                const selected = draft.backgroundMode === preset.theme.backgroundMode &&
                  draft.background === preset.theme.background &&
                  draft.foreground === preset.theme.foreground && !draft.backgroundImage
                return (
                  <button type="button" key={preset.id} className={'theme-preset'+(selected?' selected':'')} aria-pressed={selected}
                    onClick={() => update({ ...preset.theme, backgroundImage: undefined })}>
                    <span className="theme-preset-swatch" style={slideBackgroundStyle(preset.theme)}>
                      <span className="theme-preset-lines">Aa<span/></span>
                      {selected && <span className="theme-preset-check"><Check size={13}/></span>}
                    </span>
                    <strong>{preset.name}</strong><small>{preset.subtitle}</small>
                  </button>
                )
              })}
            </div>
            {savedThemes.length > 0 && <>
              <div className="theme-section-heading"><span><Save size={14}/></span><h3>Meus temas salvos</h3></div>
              <div className="theme-saved-list">
                {savedThemes.map(saved => (
                  <button type="button" key={saved.id} onClick={() => update(normalizeSlideTheme(saved.config))}>
                    <span className="theme-saved-dot" style={{ background: normalizeSlideTheme(saved.config).background }}/>{saved.name}
                  </button>
                ))}
              </div>
            </>}
            <div className="theme-section-heading"><span>02</span><h3>Personalize o fundo</h3></div>
            <div className="theme-background-modes" role="group" aria-label="Tipo de plano de fundo">
              {([
                { id: 'solid', label: 'Cor única' },
                { id: 'gradient', label: 'Degradê' },
                { id: 'image', label: 'Imagem' },
              ] as const).map(option => (
                <button type="button" key={option.id} aria-pressed={draft.backgroundMode === option.id}
                  className={draft.backgroundMode === option.id ? 'selected' : ''} onClick={() => changeMode(option.id)}>
                  {option.label}
                </button>
              ))}
            </div>
            {image && <div className="theme-image-panel">
              <div className="theme-upload-preview" style={slideBackgroundStyle(draft)} aria-label="Imagem escolhida"/>
              <button type="button" className="theme-inline-action" onClick={() => fileInput.current?.click()}><ImagePlus size={16}/> Trocar imagem</button>
            </div>}
            {!image && <div className="theme-color-grid">
              <ColorField label="Plano de fundo" value={draft.background} onChange={value => update({ background: value })}/>
              {draft.backgroundMode === 'gradient' && <ColorField label="Cor do degradê" value={draft.accent} onChange={value => update({ accent: value })}/>}
            </div>}
            {image && <div className="theme-slider">
              <label htmlFor="theme-overlay-strength">Escurecimento da imagem <strong>{Math.round(draft.overlayOpacity * 100)}%</strong></label>
              <input id="theme-overlay-strength" type="range" min="15" max="85" step="5"
                value={Math.round(draft.overlayOpacity * 100)}
                onChange={e => update({ overlayOpacity: Number(e.target.value) / 100 })}/>
              <small>Aumente para melhorar a leitura do texto sobre a foto.</small>
              <label htmlFor="theme-image-position">Enquadramento</label>
              <select id="theme-image-position" value={draft.backgroundPosition}
                onChange={e => update({ backgroundPosition: e.target.value as SlideTheme['backgroundPosition'] })}>
                <option value="center">Centralizado</option><option value="top">Mostrar o topo</option><option value="bottom">Mostrar a base</option>
              </select>
            </div>}
            <input hidden ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp"
              onChange={e => { const file = e.target.files?.[0]; if(file) void uploadImage(file); e.target.value = '' }}/>
            {(!image || draft.backgroundMode !== 'image') && <button className="theme-upload-button" type="button"
              disabled={busy !== null} onClick={() => fileInput.current?.click()}>
              <Upload size={17}/> Enviar imagem do computador <small>JPG, PNG ou WebP · até 3 MB</small>
            </button>}
            <div className="theme-section-heading"><span>03</span><h3>Texto e detalhes</h3></div>
            <div className="theme-color-grid">
              <ColorField label="Cor do texto" value={draft.foreground} onChange={value => update({ foreground: value })}/>
              <ColorField label="Cor de destaque" value={draft.accent} onChange={value => update({ accent: value })}/>
            </div>
            <label className="theme-form-label" htmlFor="theme-font">Tipografia
              <select id="theme-font" value={draft.fontFamily} onChange={e => update({ fontFamily: e.target.value })}>
                {FONT_OPTIONS.map(font => <option value={font.value} key={font.value}>{font.label}</option>)}
              </select>
            </label>
            {lowContrast && <p role="alert" className="theme-contrast-warning">
              O texto e o fundo têm pouco contraste ({contrast.toFixed(1)}:1). Ajuste as cores para facilitar a leitura.
            </p>}
            <div className="theme-save-preset">
              <label htmlFor="theme-preset-name">Guardar este tema para outras aulas</label>
              <div><input id="theme-preset-name" value={name} maxLength={90} placeholder="Ex.: Meu tema de UML"
                onChange={e => setName(e.target.value)}/>
                <button type="button" disabled={busy !== null} onClick={() => void savePreset()}><Save size={17}/> Guardar</button>
              </div>
            </div>
          </div>
          <div className="theme-preview-column">
            <div className="theme-preview-heading"><div><strong>Prévia ao vivo</strong><span>Slide de exemplo com seu conteúdo</span></div><Layers3 size={18}/></div>
            <div className="theme-preview-stage">
              <div className="theme-preview-slide" style={slideBackgroundStyle(draft)}>
                <span className="theme-preview-kicker" style={{color:draft.accent}}>SLIDEHUB · SUA AULA</span>
                <div className="theme-preview-markdown"><MarkdownView markdown={previewMarkdown || '# Título da aula\n\nO conteúdo dos slides aparece aqui.'}/></div>
                <span className="theme-preview-counter">01 / 03</span>
              </div>
            </div>
            <div className="theme-preview-tip">
              <Check size={16}/>
              <span>O mesmo plano de fundo, as cores e a fonte serão usados em todos os slides desta aula.</span>
            </div>
            {feedback && <p className="theme-feedback" role="status">{feedback}</p>}
          </div>
        </div>
        <footer className="theme-studio-footer">
          <span>{busy === 'upload' ? 'Enviando imagem…' : 'Alterações são prévias até você aplicar.'}</span>
          <div>
            <button type="button" className="theme-cancel" onClick={onClose} disabled={busy !== null}>Cancelar</button>
            <button type="button" className="theme-apply" disabled={busy !== null || lowContrast}
              onClick={() => void applyTheme()}><Check size={18}/>{busy === 'apply' ? 'Aplicando…' : 'Aplicar a todos os slides'}</button>
          </div>
        </footer>
      </section>
    </div>
  )
}
