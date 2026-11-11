import { ArrowRight, ChevronRight, FileText, Layers3, Plus, Share2 } from 'lucide-react'
import type { CourseModule, Discipline, Lesson } from './types'

type Props = {
  discipline: Discipline
  module?: CourseModule
  modules: CourseModule[]
  lessons: Lesson[]
  canEdit: boolean
  onCreateModule: () => void
  onCreateLesson: () => void
  onToggleShare: () => void
  onOpenModule: (id: string) => void
  onOpenLesson: (lesson: Lesson) => void
}
export function CourseOverview({ discipline, module, modules, lessons, canEdit,
  onCreateModule, onCreateLesson, onToggleShare, onOpenModule, onOpenLesson }: Props) {
  if (module) {
    const items = lessons.filter(item => item.module_id === module.id)
    return <div className="f1-overview">
      <div className="titlebar"><div><span className="eyebrow">MÓDULO DE ENSINO</span><h1>{module.title}</h1><p>{module.description || 'Aulas organizadas para facilitar o aprendizado.'}</p></div>
        {canEdit && <button className="button primary" onClick={onCreateLesson}><Plus size={17}/> Nova aula</button>}
      </div>
      <div className="f1-section-heading"><div><span>CONTEÚDO</span><h2>Aulas deste módulo</h2></div><span className="f1-section-count">{items.length}</span></div>
      <div className="list f1-lessons-list">
        {items.map((lesson,i) => <button key={lesson.id} className="list-item" onClick={() => onOpenLesson(lesson)}>
          <span className="number">{String(i+1).padStart(2,'0')}</span>
          <span className="f1-list-name"><strong>{lesson.title}</strong><small>{lesson.status === 'published' ? 'Publicada' : 'Rascunho'}</small></span>
          <ChevronRight size={19}/>
        </button>)}
      </div>
      {!items.length && <div className="f1-empty"><FileText size={30}/><h3>Nenhuma aula neste módulo</h3><p>{canEdit ? 'Crie uma aula para começar a escrever e apresentar.' : 'Aguarde a publicação das aulas.'}</p></div>}
    </div>
  }
  const courseModules = modules.filter(item => item.discipline_id === discipline.id)
  return <div className="f1-overview">
    <div className="titlebar"><div><span className="eyebrow">DISCIPLINA</span><h1>{discipline.title}</h1><p>{discipline.description || 'Organize suas aulas por módulos.'}</p></div>
      {canEdit && <button className="button primary" onClick={onCreateModule}><Plus size={17}/> Novo módulo</button>}
    </div>
    {canEdit && <div className="f1-share-bar"><div><Share2 size={18}/><span>{discipline.is_public ? 'Visível para alunos autenticados' : 'Somente você pode acessar esta disciplina'}</span></div>
      <button className="button secondary" onClick={onToggleShare}>{discipline.is_public ? 'Tornar privada' : 'Disponibilizar aos alunos'}</button>
    </div>}
    <div className="f1-section-heading"><div><span>ESTRUTURA DA DISCIPLINA</span><h2>Módulos</h2></div><span className="f1-section-count">{courseModules.length}</span></div>
    <div className="card-grid f1-course-grid">
      {courseModules.map((item,i) => <button className="course-card f1-course-card" key={item.id} onClick={() => onOpenModule(item.id)}>
        <span className="f1-module-label"><Layers3 size={16}/> MÓDULO {String(i+1).padStart(2,'0')}</span>
        <h3>{item.title}</h3>
        <p>{item.description || 'Explore as aulas deste módulo.'}</p>
        <span className="f1-course-bottom"><span>{lessons.filter(lesson => lesson.module_id === item.id).length} aulas</span><ArrowRight size={18}/></span>
      </button>)}
    </div>
    {!courseModules.length && <div className="f1-empty"><Layers3 size={30}/><h3>Nenhum módulo criado</h3><p>{canEdit ? 'Adicione seu primeiro módulo para organizar as aulas.' : 'Aguarde os módulos serem publicados.'}</p></div>}
  </div>
}
