import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Presentation } from '../../src/components/Presentation'
import { DEFAULT_SLIDE_THEME } from '../../src/lib/slideThemes'
import { parseSlides } from '../../src/lib/slideParser'
import { editorSlides, emptyLayout, reconcileEditorLayout, setBlockRect } from '../../src/features/editor/layoutModel'
import '../../src/styles.css'
import '../../src/styles/f1.css'
import '../../src/styles/f3.css'
import '../../src/styles/f4.css'
import '../../src/styles/f5.css'

const slides=parseSlides([
  '# Primeira aula',
  '',
  'Uma introdução curta para apresentar o conteúdo.',
  '',
  '## Conceitos principais',
  '',
  '- Uma ideia',
  '- Outra ideia',
  '',
  '## Exercício',
  '',
  ':::exercise',
  'Qual é a primeira ideia?',
  ':::',
  '',
  ':::answer',
  'RESPOSTA RESERVADA',
  ':::'
].join('\n'))
let count=0
const layout=reconcileEditorLayout(slides,emptyLayout(),()=> 'block-'+String(++count).padStart(8,'0'))
const lesson=editorSlides(slides,layout)
const pinned=setBlockRect(layout,lesson[1].blocks[0].id,{x:.12,y:.18,w:.75,h:.28,z:2})
const models=editorSlides(slides,pinned)

function Fixture(){
  const [opened,setOpened]=useState(false)
  const canEdit=!new URLSearchParams(location.search).has('student')
  return <main>
    <h1>Ambiente de teste do apresentador</h1>
    <button type="button" onClick={()=>setOpened(true)}>Abrir apresentação</button>
    <p>Teste automatizado isolado: não usa credenciais nem acessa o Supabase.</p>
    {opened&&<Presentation slides={slides} title="Aula de teste" theme={DEFAULT_SLIDE_THEME}
      notes={[{slide_index:2,slide_key:models[2].key,notes:'ANOTAÇÃO SOMENTE PROFESSOR'}]}
      canEdit={canEdit} editorLayout={pinned} editorSlides={models}
      onClose={()=>setOpened(false)}/>}
  </main>
}
createRoot(document.getElementById('root')!).render(<Fixture/>)
