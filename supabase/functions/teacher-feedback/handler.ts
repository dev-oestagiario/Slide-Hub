import {parseFeedback,issuePayload,issueUrl} from '../_shared/feedback.ts'
type Claim={state:'claimed'|'pending'|'limit'|'forbidden'|'sent';number?:number}
export type Dependencies={
 authenticate:(token:string)=>Promise<{id:string;role:string}|null>
 configured:()=>boolean
 claim:(id:string,requestId:string)=>Promise<Claim>
 createIssue:(payload:{title:string;body:string})=>Promise<number>
 finish:(id:string,requestId:string,number:number)=>Promise<void>
}
export function makeHandler(deps:Dependencies){
 return async(req:Request)=>{
  const origin=req.headers.get('Origin')
  const allowed=origin==='https://dev-oestagiario.github.io'||origin==='http://localhost:5173'||origin==='http://127.0.0.1:5173'||origin==='http://localhost:4173'||origin==='http://127.0.0.1:4173'
  const headers={'Access-Control-Allow-Origin':allowed?origin!:'https://dev-oestagiario.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json'}
  const reply=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers})
  if(origin&&!allowed)return reply(403,{code:'forbidden'})
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers})
  if(req.method!=='POST')return reply(405,{code:'method'})
  const token=req.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1]
  if(!token)return reply(401,{code:'auth'})
  try{
   const user=await deps.authenticate(token)
   if(!user)return reply(401,{code:'auth'})
   if(!['teacher','admin'].includes(user.role))return reply(403,{code:'forbidden'})
   // Bound the request before JSON parsing, even when Content-Length is absent.
   const reader=req.body?.getReader();if(!reader)return reply(400,{code:'invalid'})
   const chunks:Uint8Array[]=[];let size=0
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16000){await reader.cancel();return reply(413,{code:'invalid'})}chunks.push(value)}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
   let raw:unknown;try{raw=JSON.parse(new TextDecoder().decode(bytes))}catch{return reply(400,{code:'invalid'})}
   // Read-only authenticated preflight; no reservation or GitHub call.
   if(raw&&typeof raw==='object'&&Object.keys(raw).length===1&&'action' in raw&&raw.action==='status')return reply(200,{ready:deps.configured()})
   const input=parseFeedback(raw)
   if(!input)return reply(400,{code:'invalid'})
   if(!deps.configured())return reply(503,{code:'unavailable'})
   const claim=await deps.claim(user.id,input.requestId)
   if(claim.state==='sent'&&Number.isSafeInteger(claim.number)&&claim.number!>0)return reply(200,{number:claim.number,url:issueUrl(claim.number!)})
   if(claim.state==='forbidden')return reply(403,{code:'forbidden'})
   if(claim.state==='limit')return reply(429,{code:'limit'})
   if(claim.state!=='claimed')return reply(409,{code:'pending'})
   // A reservation is retained after uncertain upstream failures: no blind retry.
   try{
    const number=await deps.createIssue(issuePayload(input))
    if(!Number.isSafeInteger(number)||number<=0)throw Error('Invalid GitHub response')
    await deps.finish(user.id,input.requestId,number)
    return reply(201,{number,url:issueUrl(number)})
   }catch{return reply(502,{code:'pending'})}
  }catch{return reply(503,{code:'unavailable'})}
 }
}
