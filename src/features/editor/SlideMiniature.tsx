import {useEffect,useRef,useState} from 'react'
import {SlideBlockCanvas} from './SlideBlockCanvas'
import {TemplateChrome} from '../templates/TemplateChrome'
import {inferSlideKind,visualThemeForSlide} from '../templates/model'
import type {PresentationTemplateConfig} from '../templates/model'
import {slideBackgroundStyle,themeForSlide} from '../../lib/slideThemes'
import type {SlideTheme} from '../../lib/slideThemes'
import type {EditorLayout,EditorSlide} from './layoutModel'
export function SlideMiniature({model,layout,theme,template,index,total}:{model:EditorSlide;layout:EditorLayout;theme:SlideTheme;template?:PresentationTemplateConfig|null;index:number;total:number}){
 const ref=useRef<HTMLDivElement>(null)
 const [scale,setScale]=useState(0)
 const [visible,setVisible]=useState(false)
 useEffect(()=>{
   const node=ref.current;if(!node)return
   const measure=()=>setScale(node.clientWidth/800)
   const resize=new ResizeObserver(measure);resize.observe(node);measure()
   if(typeof IntersectionObserver==='undefined'){setVisible(true);return ()=>resize.disconnect()}
   const observer=new IntersectionObserver(entries=>setVisible(entries.some(e=>e.isIntersecting)),{rootMargin:'80px'})
   observer.observe(node)
   return ()=>{resize.disconnect();observer.disconnect()}
 },[])
 const slide=model.slide
 const colors=slideBackgroundStyle(themeForSlide(visualThemeForSlide(template??null,theme,inferSlideKind(slide,index)),slide.theme))
 return <div ref={ref} className="f13-miniature-viewport" aria-hidden="true" inert>
  {visible&&scale>0&&<div className="f1-preview-stage f13-miniature-stage" style={{transform:'scale('+scale+')'}}>
   <div className={['mini-slide','f3-lesson-preview','f3-layout-'+slide.layout,template?'f3-density-'+template.density:'',
      template?.branding.showHeader?'f3-with-header':'',template?.footer.text||template?.footer.showPageNumber?'f3-with-footer':''].join(' ')} style={colors}>
     <div className="f3-preview-content f4-preview-shell"><SlideBlockCanvas slide={model} layout={layout}/></div>
     {template&&<TemplateChrome config={template} index={index} total={total}/>}
   </div>
  </div>}
 </div>
}
