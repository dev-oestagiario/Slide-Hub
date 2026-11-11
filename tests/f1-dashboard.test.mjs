import test from 'node:test'
import assert from 'node:assert/strict'
import { getDashboardStats, getRecentLessons } from '../src/features/courses/selectors.ts'

const disciplines = [
  { id:'a', owner_id:'teacher', title:'Algoritmos', description:'', is_public:false },
  { id:'b', owner_id:'teacher', title:'Redes', description:'', is_public:true }
]
const modules = [
  { id:'ma', discipline_id:'a', title:'Módulo A', description:'', position:0 },
  { id:'mb', discipline_id:'b', title:'Módulo B', description:'', position:1 },
  { id:'orphan', discipline_id:'unknown', title:'Fora', description:'', position:0 }
]
const lessons = [
  { id:'l1', module_id:'ma', title:'Primeira', markdown:'# 1', status:'draft', position:0, template_id:null, updated_at:'2026-11-10T12:00:00Z' },
  { id:'l2', module_id:'mb', title:'Segunda', markdown:'# 2', status:'published', position:0, template_id:null, updated_at:'2026-11-11T12:00:00Z' },
  { id:'lo', module_id:'orphan', title:'Outra', markdown:'# 3', status:'draft', position:0, template_id:null }
]

test('dashboard usa apenas disciplinas e aulas acessíveis pelos relacionamentos',()=>{
  assert.deepEqual(getDashboardStats(disciplines, modules, lessons), {
    disciplines:2, modules:2, lessons:2, published:1
  })
})

test('aulas recentes mantêm os vínculos e respeitam atualização e limite',()=>{
  const recent = getRecentLessons(lessons, modules, disciplines, 2)
  assert.deepEqual(recent.map(item=>item.lesson.id),['l2','l1'])
  assert.equal(recent[0].discipline.title,'Redes')
  assert.equal(recent[0].module.title,'Módulo B')
  assert.equal(getRecentLessons(lessons, modules, disciplines, 0).length,0)
})

test('coleções vazias e conteúdos sem relacionamento não quebram a visão geral',()=>{
  assert.deepEqual(getDashboardStats([],[],[]),{disciplines:0,modules:0,lessons:0,published:0})
  assert.deepEqual(getRecentLessons(lessons,[],disciplines),[])
  assert.deepEqual(getRecentLessons(lessons,modules,[]),[])
})
