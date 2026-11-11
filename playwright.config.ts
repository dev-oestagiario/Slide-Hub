import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir:'./tests/e2e',
  testMatch:'**/*.spec.ts',
  timeout:45_000,
  expect:{timeout:15_000},
  retries:process.env.CI?1:0,
  reporter:process.env.CI?'github':'list',
  use:{
    baseURL:'http://127.0.0.1:4173',
    trace:'retain-on-failure',
    screenshot:'only-on-failure'
  },
  projects:[
    {name:'chromium-desktop',use:{browserName:'chromium',viewport:{width:1440,height:900}}},
    {name:'chromium-mobile',use:{browserName:'chromium',viewport:{width:390,height:844},isMobile:true,hasTouch:true}}
  ],
  webServer:{
    command:'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url:'http://127.0.0.1:4173/tests/e2e/presenter.html',
    reuseExistingServer:!process.env.CI,
    timeout:120_000
  }
})
