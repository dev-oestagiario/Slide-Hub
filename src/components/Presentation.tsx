import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from 'lucide-react'
import { MarkdownView } from './MarkdownView'
import { nextSlide, previousSlide } from '../lib/presentationNavigation'
import type { Slide } from '../lib/slideParser'

export type PresentationTheme = {
  background: string
  foreground: string
  accent: string
  fontFamily?: string
}

type SpeakerNote = { slide_index: number; notes: string }
type PresentationProps = {
  slides: Slide[]
  title: string
  theme: PresentationTheme
  notes: SpeakerNote[]
  canEdit: boolean
  onClose: () => void
}

const light: PresentationTheme = { background: '#FAFCFB', foreground: '#12544F', accent: '#1E7C74' }
const dark: PresentationTheme = { background: '#12544F', foreground: '#F4F7F6', accent: '#7FE0D4' }

export function Presentation({ slides, title, theme, notes, canEdit, onClose }: PresentationProps) {
  const [index, setIndex] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [speakerMode, setSpeakerMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [started] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const onCloseRef = useRef(onClose)

  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [started])
  useEffect(() => {
    const update = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', update)
    update()
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (event.ctrlKey || event.altKey || event.metaKey) return
      if (target instanceof HTMLElement && target.closest('input,textarea,select,[contenteditable="true"]')) return
      if (target instanceof HTMLButtonElement && event.key === ' ') return
      if (event.key === 'Escape') { onCloseRef.current(); return }
      if (['ArrowRight','ArrowDown',' ','PageDown'].includes(event.key)) {
        event.preventDefault()
        setIndex(current => nextSlide(current, slides.length))
        setShowSolution(false)
      } else if (['ArrowLeft','ArrowUp','PageUp'].includes(event.key)) {
        event.preventDefault()
        setIndex(current => previousSlide(current))
        setShowSolution(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [slides.length])

  const slide = slides[index] ?? slides[0]
  if (!slide) return null
  const colors = slide.theme === 'dark' ? dark : slide.theme === 'light' ? light : theme
  const followingSlide = slides[index + 1]

  function advance(direction: 'previous' | 'next') {
    setIndex(current => direction === 'next' ? nextSlide(current, slides.length) : previousSlide(current))
    setShowSolution(false)
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined)
    } else {
      void document.documentElement.requestFullscreen?.().catch(() => undefined)
    }
  }

  return (
    <div
      className="slideshow"
      role="dialog"
      aria-modal="true"
      aria-label={'Apresentação da aula: ' + title}
      style={{ background: colors.background, color: colors.foreground, fontFamily: theme.fontFamily || 'inherit' }}
    >
      <header className="slide-header">
        <span>{title}</span>
        <div>
          {canEdit && <button onClick={() => setSpeakerMode(value => !value)} aria-pressed={speakerMode}>{speakerMode ? 'Ocultar notas' : 'Modo professor'}</button>}
          <button onClick={toggleFullscreen} aria-label={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}>
            {isFullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
          </button>
          <button onClick={onClose} aria-label="Fechar apresentação"><X size={20} /></button>
        </div>
      </header>
      <div className={'slide-layout ' + (speakerMode ? 'teacher-view' : '')}>
        <section className={'slide-body layout-' + slide.layout} style={{ '--slide-accent': colors.accent } as CSSProperties}>
          <span className="eyebrow">SLIDEHUB / {String(index + 1).padStart(2, '0')}</span>
          <div className="slide-text"><MarkdownView markdown={slide.markdown} /></div>
          {slide.answer && (
            <div className="slide-answer">
              {showSolution && <div><strong>Gabarito</strong><MarkdownView markdown={slide.answer} /></div>}
              <button className="slide-answer-btn" onClick={() => setShowSolution(value => !value)} aria-expanded={showSolution}>
                {showSolution ? 'Ocultar solução' : 'Revelar gabarito'}
              </button>
            </div>
          )}
        </section>
        {canEdit && speakerMode && (
          <aside className="speaker-panel">
            <h3>Notas do apresentador</h3>
            <p>Tempo: {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</p>
            <h4>Notas privadas</h4>
            <p>{notes.find(note => note.slide_index === index)?.notes || 'Sem notas para este slide.'}</p>
            <h4>Próximo slide</h4>
            {followingSlide ? <div className="speaker-next"><MarkdownView markdown={followingSlide.markdown} /></div> : <p>Fim da apresentação</p>}
          </aside>
        )}
      </div>
      <footer className="slide-controls">
        <div>
          <button onClick={() => advance('previous')} disabled={index === 0} aria-label="Slide anterior"><ChevronLeft /></button>
          <span role="status" aria-live="polite">{index + 1} de {slides.length}</span>
          <button onClick={() => advance('next')} disabled={index === slides.length - 1} aria-label="Próximo slide"><ChevronRight /></button>
        </div>
        <div className="slide-progress" role="progressbar" aria-label="Progresso da apresentação" aria-valuemin={0} aria-valuemax={slides.length} aria-valuenow={index + 1}>
          <span style={{ width: ((index + 1) / slides.length) * 100 + '%', background: colors.accent }} />
        </div>
      </footer>
    </div>
  )
}
