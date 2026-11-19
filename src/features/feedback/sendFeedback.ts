import {supabase} from '../../lib/supabase'
import type {FeedbackInput} from '../../../supabase/functions/_shared/feedback'
import type {FeedbackResult} from './FeedbackDialog'
const messages:Record<string,string>={auth:'Sua sessão expirou. Entre novamente.',forbidden:'Apenas professores e administradores podem abrir TF.',invalid:'Revise os campos da TF.',limit:'Limite temporário de envios atingido. Tente novamente mais tarde.',pending:'Não foi possível confirmar o envio. Não abra outra TF igual; consulte a equipe.',unavailable:'O envio de TF está temporariamente indisponível.'}
export async function sendFeedback(payload:FeedbackInput):Promise<FeedbackResult>{
 if(!supabase)throw Error(messages.unavailable)
 const {data,error}=await supabase.functions.invoke('teacher-feedback',{body:payload})
 if(error){
  let code='pending'
  try{const body=await error.context?.json();if(typeof body?.code==='string')code=body.code}catch{}
  throw Error(messages[code]||messages.unavailable)
 }
 return data
}

/** Checks server-side configuration; never creates an issue. */
export async function checkFeedbackAvailability():Promise<boolean>{
 if(!supabase)return false
 const {data,error}=await supabase.functions.invoke('teacher-feedback',{body:{action:'status'}})
 return !error&&data?.ready===true
}