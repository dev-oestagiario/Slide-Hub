import { useMemo } from 'react'
import { MarkdownView } from '../../components/MarkdownView'
import { parseSlides } from '../../lib/slideParser'
import { slideBackgroundStyle } from '../../lib/slideThemes'
import sampleDiagram from '../../assets/template-diagram.svg'
import type { PresentationTemplateConfig, SlideKind } from './model'
import { layoutForSlide, visualThemeForSlide } from './model'
import { TemplateChrome } from './TemplateChrome'

export const SAMPLE_KIND_OPTIONS: ReadonlyArray<{kind:SlideKind; label:string; subtitle:string}> = [
  {kind:'cover',label:'Capa',subtitle:'Abertura da apresentação'},
  {kind:'content',label:'Conteúdo',subtitle:'Explicação de conceito'},
  {kind:'list',label:'Lista',subtitle:'Tópicos e etapas'},
  {kind:'quote',label:'Citação',subtitle:'Ideia em destaque'},
  {kind:'image',label:'Imagem',subtitle:'Texto e ilustração'},
  {kind:'comparison',label:'Comparação',subtitle:'Tabela e dados'},
  {kind:'exercise',label:'Exercício',subtitle:'Pergunta para os alunos'},
  {kind:'closing',label:'Encerramento',subtitle:'Resumo final'}
]
const SAMPLE_MARKDOWN: Record<Exclude<SlideKind,'image'>,string> = {
  cover:'# Introdução à Engenharia\n\nIdeias que se transformam em projetos.',
  content:'# O que vamos aprender?\n\nUma boa apresentação começa com uma explicação objetiva.\n\nVamos relacionar conceitos e exemplos práticos.',
  list:'# Etapas do projeto\n\n- Identificar o problema\n- Organizar as ideias\n- Construir a solução',
  quote:'# Ideia essencial\n\n> Aprender é construir conexões entre conceitos.\n\nO exemplo fortalece o conteúdo.',
  comparison:'# Comparando conceitos\n\n| Modelo | Aplicação |\n| --- | --- |\n| A | Conceito |\n| B | Prática |',
  exercise:'# Hora de praticar\n\n:::exercise\nComo você aplicaria esse conceito no cotidiano?\n:::',
  closing:'# Conclusão\n\nRevisamos os principais conceitos.\n\nObrigado pela participação!'
}
type Props = { config:PresentationTemplateConfig; kind?:SlideKind }
export function TemplatePreview({config,kind='cover'}:Props) {
  const source=kind==='image'
    ? '# Ilustração do processo\n\n![Diagrama de entrada, processo e saída]('+sampleDiagram+')\n\nExemplo de representação visual.'
    : SAMPLE_MARKDOWN[kind]
  const slide=useMemo(()=>parseSlides(source,false)[0],[source])
  const layout=layoutForSlide(config,slide,kind==='cover'?0:1)
  const theme=visualThemeForSlide(config,config.theme,kind)
  return <div className="f2-preview-wrap">
    <div className={[
      'f2-preview-slide','f2-layout-'+layout,'f3-preview-slide','f3-density-'+config.density,
      config.branding.showHeader?'f3-with-header':'',
      config.footer.showPageNumber||config.footer.text?'f3-with-footer':''
    ].join(' ')} style={slideBackgroundStyle(theme)}>
      <div className="f2-preview-content"><MarkdownView markdown={slide.markdown}/></div>
      <TemplateChrome config={config} index={0} total={3}/>
    </div>
  </div>
}
