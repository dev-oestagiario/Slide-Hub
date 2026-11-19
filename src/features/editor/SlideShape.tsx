import { validShape } from './slideOperations'
export function SlideShape({value}:{value:string}){
  const shape=value.trim()
  if(!validShape(shape))return <code>{value}</code>
  const paths:Record<string,React.ReactNode>={
    rectangle:<rect x="7" y="7" width="146" height="86"/>,
    rounded:<rect x="7" y="7" width="146" height="86" rx="17"/>,
    circle:<circle cx="80" cy="50" r="43"/>,
    triangle:<path d="M80 7 153 93H7Z"/>,
    diamond:<path d="M80 7 153 50 80 93 7 50Z"/>,
    line:<path d="M8 50H152" fill="none" strokeWidth="5"/>,
    arrow:<path d="M8 42H116V24L151 50 116 76V58H8Z"/>,
    check:<path d="m32 52 28 28 65-62" fill="none" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>,
    star:<path d="m80 5 13 29 32 4-24 22 6 31-27-15-27 15 6-31-24-22 32-4Z"/>,
    info:<><circle cx="80" cy="50" r="43" fill="none" strokeWidth="4"/><path d="M80 47V74" strokeWidth="7" strokeLinecap="round"/><circle cx="80" cy="31" r="4"/></>
  }
  return <svg className="f12-shape" viewBox="0 0 160 100" role="img" aria-label={'Forma '+shape} fill="currentColor" stroke="currentColor" strokeWidth="1" preserveAspectRatio="xMidYMid meet">{paths[shape]}</svg>
}
