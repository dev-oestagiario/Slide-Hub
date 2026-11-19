import { useId } from 'react'
import { Group, Ungroup, Lock, Unlock, RotateCcw, RotateCw, AlignLeft, AlignRight, AlignCenterHorizontal, AlignCenterVertical, AlignStartHorizontal, AlignEndHorizontal, Columns3, Rows3 } from 'lucide-react'
import { applyMultiAction } from './multiGeometry'
import type { MultiAction, RectSet } from './multiGeometry'

const actions=[
 ['left','Alinhar à esquerda (seleção)',AlignLeft],
 ['centerX','Centralizar horizontalmente (seleção)',AlignCenterHorizontal],
 ['right','Alinhar à direita (seleção)',AlignRight],
 ['top','Alinhar ao topo (seleção)',AlignStartHorizontal],
 ['centerY','Centralizar verticalmente (seleção)',AlignCenterVertical],
 ['bottom','Alinhar à base (seleção)',AlignEndHorizontal],
 ['distributeX','Distribuir horizontalmente',Columns3],
 ['distributeY','Distribuir verticalmente',Rows3]
] as const
type Props={rects:RectSet;onChange:(updates:RectSet)=>void}
export function MultiElementTools({rects,onChange}:Props){
  const items=Object.values(rects),count=items.length
  const labelId=useId()
  if(!count)return <p className="f9-selection-hint">Selecione um elemento. Use Shift + clique ou ative a seleção múltipla.</p>
  const anyLocked=items.some(r=>r.locked)
  const allLocked=items.every(r=>r.locked)
  const run=(action:MultiAction)=>{
    const changes=applyMultiAction(rects,action,action==='group'?crypto.randomUUID():undefined)
    if(Object.keys(changes).length)onChange(changes)
  }
  return <section className="f9-tools" aria-labelledby={labelId}>
    <header><strong id={labelId}>{count===1?'Elemento selecionado':count+' elementos selecionados'}</strong>
      {anyLocked&&<small>Há elementos bloqueados</small>}</header>
    <div className="f9-action-row">
      {count>1&&<>
        <button type="button" disabled={anyLocked} onClick={()=>run('group')}><Group size={16}/> Agrupar</button>
        <button type="button" disabled={anyLocked||!items.some(r=>r.group)} onClick={()=>run('ungroup')}><Ungroup size={16}/> Desagrupar</button>
      </>}
      <button type="button" disabled={allLocked} onClick={()=>run('lock')}><Lock size={16}/> Bloquear</button>
      <button type="button" disabled={!anyLocked} onClick={()=>run('unlock')}><Unlock size={16}/> Desbloquear</button>
      {count===1&&<>
        <button type="button" disabled={anyLocked} title="Girar 15° à esquerda" aria-label="Girar à esquerda" onClick={()=>run('rotateLeft')}><RotateCcw size={16}/></button>
        <button type="button" disabled={anyLocked} title="Girar 15° à direita" aria-label="Girar à direita" onClick={()=>run('rotateRight')}><RotateCw size={16}/></button>
        <small>{items[0].rotation??0}°</small>
      </>}
    </div>
    {count>1&&<div className="f9-action-row" role="group" aria-label="Alinhamento e distribuição de elementos">
      {actions.map(([action,label,Icon])=><button type="button" key={action}
        disabled={anyLocked||((action==='distributeX'||action==='distributeY')&&count<3)}
        title={label} aria-label={label} onClick={()=>run(action)}><Icon size={17}/></button>)}
    </div>}
    {count>1&&<small>Desative seleção múltipla para arrastar os elementos juntos. Distribuição requer três elementos com espaço suficiente.</small>}
  </section>
}
