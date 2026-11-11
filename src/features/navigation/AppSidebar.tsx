import { BookOpen, ChevronDown, FileText, GraduationCap, Layers3, LogOut, LayoutTemplate, PanelLeftClose, Plus, X } from 'lucide-react'
import type { CourseModule, Discipline, Lesson, Profile } from '../courses/types'

type Props = {
  open: boolean
  canWrite: boolean
  templatesActive: boolean
  onTemplates: () => void
  email: string | undefined
  profile: Profile | null
  disciplines: Discipline[]
  modules: CourseModule[]
  lessons: Lesson[]
  disciplineId: string | null
  moduleId: string | null
  lessonId: string | null
  onClose: () => void
  onHome: () => void
  onCreateDiscipline: () => void
  onDiscipline: (id: string) => void
  onModule: (id: string) => void
  onLesson: (lesson: Lesson) => void
  onSignOut: () => void
}

export function AppSidebar({
  open, canWrite, templatesActive, onTemplates, email, profile, disciplines, modules, lessons,
  disciplineId, moduleId, lessonId, onClose, onHome, onCreateDiscipline,
  onDiscipline, onModule, onLesson, onSignOut
}: Props) {
  const role = profile?.role === 'teacher' ? 'Professor' : profile?.role === 'admin' ? 'Administrador' : 'Aluno'
  const display = profile?.full_name || email || 'Minha conta'
  return <>
    {open && <button className="f1-mobile-scrim" onClick={onClose} aria-label="Fechar navegação" />}
    <aside className={'sidebar f1-sidebar ' + (open ? 'open' : '')} aria-label="Navegação lateral">
      <div className="brand f1-brand">
        <span className="brand-icon"><GraduationCap size={22} strokeWidth={2}/></span>
        <div><strong>SlideHub</strong><small>Seu estúdio de aulas</small></div>
        <button className="icon-button mobile-only" onClick={onClose} aria-label="Fechar menu"><X size={19}/></button>
      </div>
      <nav aria-label="Áreas do sistema" className="f1-primary-nav">
        <button className={'nav-home ' + (!disciplineId && !templatesActive ? 'active' : '')} aria-current={!disciplineId && !templatesActive ? 'page' : undefined} onClick={onHome}>
          <BookOpen size={18}/> Visão geral
        </button>
        {canWrite && <button className={'nav-home ' + (templatesActive ? 'active' : '')}
          aria-current={templatesActive ? 'page' : undefined} onClick={onTemplates}>
          <LayoutTemplate size={18}/> Templates
        </button>}
      </nav>
      <div className="side-label">
        <span>MINHAS DISCIPLINAS</span>
        {canWrite && <button onClick={onCreateDiscipline} aria-label="Criar disciplina" title="Criar disciplina"><Plus size={17}/></button>}
      </div>
      <nav className="side-scroll" aria-label="Disciplinas e aulas">
        {disciplines.length === 0 && <p className="f1-nav-empty">Suas disciplinas aparecerão aqui.</p>}
        {disciplines.map(discipline => {
          const active = disciplineId === discipline.id
          const courseModules = modules.filter(module => module.discipline_id === discipline.id)
          return <div key={discipline.id} className="f1-nav-course">
            <button className={'side-item ' + (active ? 'active' : '')}
              aria-expanded={active} title={discipline.title} onClick={() => onDiscipline(discipline.id)}>
              <GraduationCap size={17}/><span>{discipline.title}</span>
              <ChevronDown className="f1-side-chevron" size={14}/>
            </button>
            {active && courseModules.map(module => {
              const selected = moduleId === module.id
              return <div className="side-nested" key={module.id}>
                <button className={'side-item ' + (selected ? 'active' : '')} title={module.title}
                  aria-expanded={selected} onClick={() => onModule(module.id)}>
                  <Layers3 size={15}/><span>{module.title}</span>
                </button>
                {selected && lessons.filter(lesson => lesson.module_id === module.id).map(lesson =>
                  <button key={lesson.id} title={lesson.title}
                    className={'side-item side-lesson ' + (lessonId === lesson.id ? 'active' : '')}
                    aria-current={lessonId === lesson.id ? 'page' : undefined}
                    onClick={() => onLesson(lesson)}>
                    <FileText size={15}/><span>{lesson.title}</span>
                  </button>
                )}
              </div>
            })}
          </div>
        })}
      </nav>
      <div className="f1-sidebar-bottom">
        <div className="f1-sidebar-tip"><PanelLeftClose size={17}/><span>Escreva uma vez. Apresente em slides.</span></div>
        <div className="sidebar-foot">
          <div className="f1-avatar" aria-hidden="true">{display.slice(0, 1).toUpperCase()}</div>
          <div className="f1-account"><span title={display}>{display}</span><small>{role}</small></div>
          <button className="icon-button" onClick={onSignOut} aria-label="Sair da conta" title="Sair"><LogOut size={18}/></button>
        </div>
      </div>
    </aside>
  </>
}
