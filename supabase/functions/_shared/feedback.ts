export const categories=['bug','improvement'] as const
export const areas=['dashboard','discipline','editor','templates'] as const
export type FeedbackInput={requestId:string;category:typeof categories[number];area:typeof areas[number];title:string;description:string;consent:true}
export const categoryLabels={bug:'Problema',improvement:'Melhoria'}
export const areaLabels={dashboard:'Visão geral',discipline:'Disciplinas e módulos',editor:'Editor de aulas',templates:'Templates'}
export const issueUrl=(number:number)=>'https://github.com/dev-oestagiario/Slide-Hub/issues/'+number
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function parseFeedback(raw:unknown):FeedbackInput|null{
 if(!raw||typeof raw!=='object')return null
 const x=raw as Record<string,unknown>
 if(Object.keys(x).some(k=>!['requestId','category','area','title','description','consent'].includes(k)))return null
 if(typeof x.requestId!=='string'||!uuid.test(x.requestId)||!categories.includes(x.category as never)||!areas.includes(x.area as never)||x.consent!==true||typeof x.title!=='string'||typeof x.description!=='string')return null
 const title=x.title.trim(),description=x.description.trim()
 if(title.length<5||title.length>120||/[\r\n\x00-\x1f]/.test(title)||description.length<10||description.length>2000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(description))return null
 return {requestId:x.requestId,category:x.category as FeedbackInput['category'],area:x.area as FeedbackInput['area'],title,description,consent:true}
}
export function issuePayload(input:FeedbackInput){
 const plain=(text:string)=>text.replace(/@/g,'＠')
 return {title:'[TF · '+categoryLabels[input.category]+'] '+plain(input.title),body:'**Origem:** SlidesEdu — feedback de professor\n\n**Área:** '+areaLabels[input.area]+'\n\n**Descrição**\n\n'+plain(input.description).split(/\r?\n/).map(line=>'    '+line).join('\n')+'\n\n---\nReferência de envio: '+input.requestId}
}
