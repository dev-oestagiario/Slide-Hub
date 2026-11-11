import { ArrowRight, BookOpen, FilePlus2, FileText, GraduationCap, Layers3, LayoutTemplate, Play, Sparkles } from 'lucide-react'
import type { CourseModule, Discipline, Lesson } from '../courses/types'
import { getDashboardStats, getRecentLessons } from '../courses/selectors'

type Props = {
  canWrite: boolean
  disciplines: Discipline[]
  modules: CourseModule[]
  lessons: Lesson[]
  onCreateDiscipline: () => void
  onOpenTemplates: () => void
  onOpenDiscipline: (id: string) => void
  onOpenLesson: (lesson: Lesson) => void
}

export function Dashboard({ canWrite, disciplines, modules, lessons, onCreateDiscipline, onOpenTemplates, onOpenDiscipline, onOpenLesson }: Props) {
  const stats = getDashboardStats(disciplines, modules, lessons)
  const recent = getRecentLessons(lessons, modules, disciplines, 4)
  return <div className="f1-dashboard">
    <section className="f1-welcome" aria-labelledby="f1-welcome-title">
      <div className="f1-welcome-copy">
        <span className="f1-kicker"><Sparkles size={15}/> SLIDEHUB STUDIO</span>
        <h1 id="f1-welcome-title">{canWrite ? 'Suas ideias, prontas para apresentar.' : 'Seu espaço de aprendizagem.'}</h1>
        <p>{canWrite ? 'Escreva ou dite sua aula. O SlideHub organiza o conteúdo em slides, e você decide como apresentar.' : 'Acesse as disciplinas e aulas que seus professores disponibilizaram.'}</p>
        <div className="f1-welcome-actions">
          {canWrite && <button className="button primary" onClick={onCreateDiscipline}><FilePlus2 size={17}/> Nova disciplina</button>}
          {canWrite && <button className="button secondary" onClick={onOpenTemplates}><LayoutTemplate size={16}/> Templates</button>}
          {recent[0] && <button className="button secondary" onClick={() => onOpenLesson(recent[0].lesson)}>
            <Play size={16}/> {canWrite ? 'Continuar aula' : 'Abrir aula'}
          </button>}
        </div>
      </div>
      <div className="f1-welcome-art" aria-hidden="true">
        <div className="f1-art-slide"><span>SLIDEHUB</span><strong>Aula pronta em minutos.</strong><div className="f1-art-line"/><div className="f1-art-line short"/><i>01 / 08</i></div>
        <div className="f1-art-note"><span>## Conceitos essenciais</span><span>- Ideias</span><span>- Exemplos</span><span>- Aprendizado</span></div>
      </div>
    </section>
    <section className="f1-stats" aria-label="Resumo das disciplinas">
      <div className="f1-stat"><div className="f1-stat-icon"><BookOpen size={18}/></div><div><strong>{stats.disciplines}</strong><span>Disciplinas</span></div></div>
      <div className="f1-stat"><div className="f1-stat-icon"><Layers3 size={18}/></div><div><strong>{stats.modules}</strong><span>Módulos</span></div></div>
      <div className="f1-stat"><div className="f1-stat-icon"><FileText size={18}/></div><div><strong>{stats.lessons}</strong><span>Aulas disponíveis</span></div></div>
      <div className="f1-stat"><div className="f1-stat-icon"><GraduationCap size={18}/></div><div><strong>{stats.published}</strong><span>Publicadas</span></div></div>
    </section>
    {recent.length > 0 && <section className="f1-section" aria-labelledby="f1-recent-title">
      <div className="f1-section-heading"><div><span>CONTINUE DE ONDE PAROU</span><h2 id="f1-recent-title">Aulas recentes</h2></div></div>
      <div className="f1-recent-grid">
        {recent.map(({lesson, module, discipline}) =>
          <button key={lesson.id} className="f1-recent-item" onClick={() => onOpenLesson(lesson)}>
            <span className="f1-recent-icon"><FileText size={18}/></span>
            <span className="f1-recent-meta"><strong>{lesson.title}</strong><small>{discipline.title} / {module.title}</small></span>
            <span className={'f1-lesson-status ' + (lesson.status === 'published' ? 'published' : '')}>{lesson.status === 'published' ? 'Publicada' : 'Rascunho'}</span>
            <ArrowRight size={17} className="f1-recent-arrow"/>
          </button>)}
      </div>
    </section>}
    <section className="f1-section" aria-labelledby="f1-courses-title">
      <div className="f1-section-heading"><div><span>ORGANIZE SEU CONTEÚDO</span><h2 id="f1-courses-title">Disciplinas</h2></div><span className="f1-section-count">{stats.disciplines}</span></div>
      <div className="card-grid f1-course-grid">
        {disciplines.map((discipline, i) =>
          <button key={discipline.id} className="course-card f1-course-card" onClick={() => onOpenDiscipline(discipline.id)}>
            <span className={'f1-course-symbol f1-course-symbol-' + (i % 4)} aria-hidden="true"><GraduationCap size={22}/></span>
            <h3>{discipline.title}</h3>
            <p>{discipline.description || 'Aulas e conteúdos organizados por módulos.'}</p>
            <span className="f1-course-bottom"><span>{modules.filter(module => module.discipline_id === discipline.id).length} módulos</span><ArrowRight size={18}/></span>
          </button>)}
      </div>
      {disciplines.length === 0 && <div className="f1-empty">
        <BookOpen size={29}/>
        <h3>{canWrite ? 'Comece criando sua primeira disciplina' : 'Nenhuma disciplina disponível ainda'}</h3>
        <p>{canWrite ? 'Depois você poderá adicionar módulos, escrever aulas e gerar apresentações automaticamente.' : 'Quando seus professores publicarem conteúdos, você poderá acessá-los aqui.'}</p>
        {canWrite && <button className="button primary" onClick={onCreateDiscipline}><FilePlus2 size={16}/> Criar disciplina</button>}
      </div>}
    </section>
  </div>
}
