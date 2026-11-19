import {useEffect,useRef} from 'react'
/** Restart the current interval on resume; never advance in a hidden tab. */
export function usePlaybackTimer(enabled:boolean,delay:number,position:string,onAdvance:()=>void){
 const callback=useRef(onAdvance)
 callback.current=onAdvance
 useEffect(()=>{
   if(!enabled)return
   let timer:number|undefined
   const cancel=()=>{if(timer!==undefined)window.clearTimeout(timer);timer=undefined}
   const schedule=()=>{cancel();if(!document.hidden)timer=window.setTimeout(()=>{timer=undefined;callback.current()},delay)}
   document.addEventListener('visibilitychange',schedule)
   schedule()
   return ()=>{cancel();document.removeEventListener('visibilitychange',schedule)}
 },[enabled,delay,position])
}
