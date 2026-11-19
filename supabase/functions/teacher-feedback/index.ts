import {createClient} from 'npm:@supabase/supabase-js@2.57.0'
import {makeHandler} from './handler.ts'
const url=Deno.env.get('SUPABASE_URL')!
const anon=Deno.env.get('SUPABASE_ANON_KEY')!
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const token=Deno.env.get('SLIDEHUB_GITHUB_ISSUES_TOKEN')
const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
Deno.serve(makeHandler({
 authenticate:async(accessToken)=>{
  const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+accessToken}}})
  const {data,error}=await client.auth.getUser(accessToken)
  if(error||!data.user)return null
  const result=await client.from('profiles').select('role').eq('id',data.user.id).maybeSingle()
  if(result.error||!result.data)return null
  return {id:data.user.id,role:result.data.role}
 },
 configured:()=>Boolean(token),
 claim:async(id,requestId)=>{
  const {data,error}=await admin.rpc('claim_teacher_feedback',{p_user:id,p_request:requestId})
  if(error)throw Error('reservation unavailable')
  return data
 },
 createIssue:async(payload)=>{
  const response=await fetch('https://api.github.com/repos/dev-oestagiario/Slide-Hub/issues',{method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)})
  if(response.status!==201)throw Error('GitHub unavailable')
  return (await response.json()).number
 },
 finish:async(id,requestId,number)=>{
  const {data,error}=await admin.rpc('finish_teacher_feedback',{p_user:id,p_request:requestId,p_number:number})
  if(error||data!==true)throw Error('receipt unavailable')
 }
}))
