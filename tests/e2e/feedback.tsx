import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {AppTopbar} from '../../src/features/navigation/AppTopbar'
import {FeedbackDialog} from '../../src/features/feedback/FeedbackDialog'
import {checkFeedbackAvailability,sendFeedback} from '../../src/features/feedback/sendFeedback'
import '../../src/styles.css'
import '../../src/styles/f1.css'
import '../../src/styles/f2.css'
import '../../src/styles/feedback.css'
if(import.meta.env.VITE_SUPABASE_URL!=='http://127.0.0.1:4173')throw Error('Only local fixture')
function Fixture(){
 const [open,setOpen]=useState(false)
 const teacher=new URLSearchParams(location.search).get('role')!=='student'
 return <><AppTopbar discipline={undefined} module={undefined} lesson={undefined} onHome={()=>{}} onModule={()=>{}} onDiscipline={()=>{}} onOpenMenu={()=>{}} onFeedback={teacher?()=>setOpen(true):undefined}/>{open&&<FeedbackDialog area="dashboard" onClose={()=>setOpen(false)} send={sendFeedback} check={checkFeedbackAvailability}/>}</>
}
createRoot(document.getElementById('root')!).render(<Fixture/>)
