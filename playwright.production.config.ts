import {defineConfig} from '@playwright/test'
export default defineConfig({
 testDir:'./tests/production',
 timeout:60000,
 expect:{timeout:20000},
 retries:0,
 workers:1,
 reporter:'list',
 use:{baseURL:'https://dev-oestagiario.github.io/Slide-Hub/',browserName:'chromium',channel:'chrome',
  trace:'off',screenshot:'off',video:'off'},
 projects:[
  {name:'desktop',use:{viewport:{width:1440,height:900}}},
  {name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}
 ]
})
