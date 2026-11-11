export function nextSlide(current: number, total: number) {
  return total <= 0 ? 0 : Math.min(total - 1, current + 1)
}
export function previousSlide(current: number) {
  return Math.max(0, current - 1)
}
export function firstSlide() {
  return 0
}
export function lastSlide(total:number) {
  return Math.max(0,total-1)
}
export type PresentationKeyAction = 'next'|'previous'|'first'|'last'|'help'|'outline'|'fullscreen'|null

/** Keyboard shortcuts only apply outside of inputs and interactive controls. */
export function presentationKeyAction(key:string):PresentationKeyAction{
  if(['ArrowRight','ArrowDown','PageDown',' '].includes(key))return 'next'
  if(['ArrowLeft','ArrowUp','PageUp'].includes(key))return 'previous'
  if(key==='Home')return 'first'
  if(key==='End')return 'last'
  if(key==='?'||key.toLowerCase()==='h')return 'help'
  if(key.toLowerCase()==='o')return 'outline'
  if(key.toLowerCase()==='f')return 'fullscreen'
  return null
}
