import type { CourseModule, Discipline, Lesson } from './types.ts'

export type RecentLesson = { lesson: Lesson; module: CourseModule; discipline: Discipline }
export function getRecentLessons(
  lessons: readonly Lesson[],
  modules: readonly CourseModule[],
  disciplines: readonly Discipline[],
  limit = 5
): RecentLesson[] {
  const courses = new Map(disciplines.map(discipline => [discipline.id, discipline]))
  const moduleMap = new Map(modules.map(module => [module.id, module]))
  return lessons.flatMap(lesson => {
    const module = moduleMap.get(lesson.module_id)
    const discipline = module && courses.get(module.discipline_id)
    return module && discipline ? [{ lesson, module, discipline }] : []
  }).sort((a, b) => {
    const aDate = Date.parse(a.lesson.updated_at ?? '') || 0
    const bDate = Date.parse(b.lesson.updated_at ?? '') || 0
    return bDate - aDate || a.lesson.title.localeCompare(b.lesson.title, 'pt-BR')
  }).slice(0, Math.max(0, limit))
}

export function getDashboardStats(
  disciplines: readonly Discipline[],
  modules: readonly CourseModule[],
  lessons: readonly Lesson[]
) {
  const validDisciplines = new Set(disciplines.map(item => item.id))
  const visibleModules = modules.filter(item => validDisciplines.has(item.discipline_id))
  const validModules = new Set(visibleModules.map(item => item.id))
  const visibleLessons = lessons.filter(item => validModules.has(item.module_id))
  return {
    disciplines: disciplines.length,
    modules: visibleModules.length,
    lessons: visibleLessons.length,
    published: visibleLessons.filter(item => item.status === 'published').length
  }
}
