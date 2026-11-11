import type { CSSProperties } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { slideBackgroundStyle } from '../../lib/slideThemes'
import type { ExportBlock, ExportPage, ExportPlan } from './exportModel'

function FixedBlock({block}:{block:ExportBlock}){
  const rect=block.rect
  const geometry:CSSProperties|undefined=rect?{
    position:'absolute',left:(rect.x*100)+'%',top:(rect.y*100)+'%',
    width:(rect.w*100)+'%',height:(rect.h*100)+'%',zIndex:rect.z
  }:undefined
  return <div className={'f6-export-block '+(rect?'f6-manual-block':'')} style={geometry}>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.markdown}</ReactMarkdown>
  </div>
}

function ExportPageView({page,plan}:{page:ExportPage;plan:ExportPlan}){
  const {brand}=plan
  return <section className={'f6-page f6-layout-'+page.layout} style={slideBackgroundStyle(page.theme)}
    aria-label={'Slide '+(page.index+1)}>
    {brand.header&&<div className={'f6-page-brand '+(brand.align==='right'?'f6-page-brand-right':'')}>
      {brand.logo&&<img src={brand.logo} alt="" />}
      <span>{brand.header}</span>
    </div>}
    {!brand.header&&brand.logo&&<div className={'f6-page-brand '+(brand.align==='right'?'f6-page-brand-right':'')}>
      <img src={brand.logo} alt=""/>
    </div>}
    {brand.accentRule&&<div className="f6-page-rule" style={{background:page.theme.accent}} aria-hidden="true"/>}
    <div className={'f6-page-content '+(page.manuallyArranged?'f6-arranged':'')}>
      {page.manuallyArranged
        ?page.blocks.map((block,index)=><FixedBlock key={index} block={block}/>)
        :<ReactMarkdown remarkPlugins={[remarkGfm]}>{page.markdown}</ReactMarkdown>}
    </div>
    {(brand.footer||brand.pageNumber)&&<footer className="f6-page-footer">
      <span>{brand.footer}</span>
      {brand.pageNumber&&<span>{String(page.index+1).padStart(2,'0')} / {String(plan.pages.length).padStart(2,'0')}</span>}
    </footer>}
  </section>
}
export function ExportPages({plan}:{plan:ExportPlan}){
  return <div className="f6-pages">{plan.pages.map(page=><ExportPageView key={page.index} page={page} plan={plan}/>)}</div>
}
