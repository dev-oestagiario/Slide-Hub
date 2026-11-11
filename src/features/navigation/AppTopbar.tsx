import { ChevronRight, Menu, Sparkles } from 'lucide-react'
import type { CourseModule, Discipline, Lesson } from '../courses/types'
type Props = {
  discipline: Discipline | undefined
  module: CourseModule | undefined
  lesson: Lesson | undefined
  onOpenMenu: () => void
  onHome: () => void
  onDiscipline: (id: string) => void
  onModule: (id: string) => void
}
export function AppTopbar({ discipline, module, lesson, onOpenMenu, onHome, onDiscipline, onModule }: Props) {
  return <header className="topbar f1-topbar">
    <button className="icon-button mobile-only" aria-label="Abrir menu" onClick={onOpenMenu}><Menu/></button>
    <nav aria-label="Caminho de navegação" className="crumb">
      <button onClick={onHome}>Início</button>
      {discipline && <><ChevronRight size={14}/><button onClick={() => onDiscipline(discipline.id)}>{discipline.title}</button></>}
      {module && <><ChevronRight size={14}/><button onClick={() => onModule(module.id)}>{module.title}</button></>}
      {lesson && <><ChevronRight size={14}/><strong title={lesson.title}>{lesson.title}</strong></>}
    </nav>
    <span className="f1-topbar-tag"><Sparkles size={14}/> Escrita que vira apresentação</span>
  </header>
}
