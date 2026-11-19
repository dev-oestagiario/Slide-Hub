import {useEffect,useRef,useState} from 'react'
import type {FormEvent} from 'react'
import {MessageSquarePlus,ExternalLink,X} from 'lucide-react'
import {ModalShell} from '../../components/ModalShell'
import {areaLabels,categoryLabels,issueUrl,parseFeedback} from '../../../supabase/functions/_shared/feedback'
import type {FeedbackInput} from '../../../supabase/functions/_shared/feedback'
export type FeedbackResult={number:number;url:string}
type Props={area:FeedbackInput['area'];onClose:()=>void;send:(input:FeedbackInput)=>Promise<FeedbackResult>;check:()=>Promise<boolean>}
export function FeedbackDialog({area,onClose,send,check}:Props){
 const [category,setCategory]=useState<FeedbackInput['category']>('improvement')
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[consent,setConsent]=useState(false)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<FeedbackResult|null>(null)
 const requestId=useRef(crypto.randomUUID())
 const sending=useRef(false)
 const [submitted,setSubmitted]=useState(false)
 const [availability,setAvailability]=useState<'loading'|'ready'|'unavailable'>('loading')
 const [checkAttempt,setCheckAttempt]=useState(0)
 useEffect(()=>{
  let active=true;setAvailability('loading')
  void check().then(ready=>{if(active)setAvailability(ready?'ready':'unavailable')}).catch(()=>{if(active)setAvailability('unavailable')})
  return ()=>{active=false}
 },[check,checkAttempt])
 const close=()=>{if(!sending.current)onClose()}
 async function submit(event:FormEvent){
  event.preventDefault()
  if(sending.current||result||availability!=='ready')return
  const payload=parseFeedback({requestId:requestId.current,category,area,title,description,consent})
  if(!payload){setError('Preencha o título, a descrição e confirme o envio.');return}
  sending.current=true;setSubmitted(true);setBusy(true);setError('')
  try{const value=await send(payload);if(!Number.isSafeInteger(value.number)||value.number<=0||value.url!==issueUrl(value.number))throw Error('Não foi possível confirmar a TF.');setResult(value)}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível enviar a TF.')}
  finally{sending.current=false;setBusy(false)}
 }
 return <ModalShell label="Abrir TF" onClose={close}><div className="feedback-dialog">
  <header><div><h2><MessageSquarePlus size={22}/> Abrir TF</h2><p>Informe uma melhoria ou um problema para a equipe de desenvolvimento.</p></div><button type="button" className="icon-button" disabled={busy} onClick={close} aria-label="Fechar TF"><X size={20}/></button></header>
  {result?<div role="status" className="feedback-success"><strong>TF #{result.number} criada com sucesso.</strong><a href={result.url} target="_blank" rel="noopener noreferrer">Acompanhar no GitHub <ExternalLink size={15}/></a><button className="button primary" onClick={close}>Concluir</button></div>:
   availability!=='ready'?<div className="feedback-success" role="status"><p>{availability==='loading'?'Verificando disponibilidade do envio…':'O envio de TF ainda está indisponível. Tente novamente mais tarde ou avise a equipe.'}</p>{availability==='unavailable'&&<button className="button secondary" type="button" onClick={()=>setCheckAttempt(n=>n+1)}>Verificar novamente</button>}<button className="button secondary" type="button" onClick={close}>Fechar</button></div>:
   <form onSubmit={event=>void submit(event)}>
    <fieldset disabled={busy||submitted}><label>Tipo<select value={category} onChange={e=>setCategory(e.target.value as FeedbackInput['category'])}>{Object.entries(categoryLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
     <label>Área do sistema<input value={areaLabels[area]} readOnly/></label>
     <label>Título<input required minLength={5} maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: Melhorar a edição de imagens"/></label>
     <label>Descrição<textarea required minLength={10} maxLength={2000} rows={5} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Explique o que aconteceu ou como a melhoria ajudaria."/></label>
     <small>{description.length}/2000 caracteres</small>
     <p className="feedback-privacy">O texto será enviado ao GitHub e poderá ficar público. Não inclua nomes, e-mails, dados de alunos, senhas ou conteúdo privado de aulas.</p>
     <label className="feedback-consent"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/> Revisei o texto e autorizo o envio ao GitHub.</label>
    </fieldset>
    {error&&<p role="alert" className="feedback-error">{error}</p>}
    <footer><button type="button" className="button secondary" onClick={close} disabled={busy}>Cancelar</button><button type="submit" className="button primary" disabled={busy||!consent}>{busy?'Enviando…':'Criar TF'}</button></footer>
   </form>}
 </div></ModalShell>
}
