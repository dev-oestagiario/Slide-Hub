/** Inspect the actual export DOM, including manually resized text and images.
 * It is a conservative preflight, not a guarantee about other browsers/printers. */
export function exportOverflow(root:HTMLElement):number[]{
 return Array.from(root.querySelectorAll<HTMLElement>('.f6-page')).flatMap((page,i)=>{
  const body=page.querySelector<HTMLElement>('.f6-page-content')
  if(!body)return []
  const bounds=body.getBoundingClientRect()
  const boxes=[body,...Array.from(body.querySelectorAll<HTMLElement>('.f6-manual-block,pre,table'))]
  const clipped=boxes.some(box=>{
    const r=box.getBoundingClientRect()
    return box.scrollHeight>box.clientHeight+3||box.scrollWidth>box.clientWidth+3||
      r.left<bounds.left-3||r.right>bounds.right+3||r.top<bounds.top-3||r.bottom>bounds.bottom+3
  })
  return clipped?[i+1]:[]
 })
}
