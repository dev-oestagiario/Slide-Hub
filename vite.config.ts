import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  // Pages serve este repositório em /Slide-Hub/; o desenvolvimento local continua em /
  base: command === 'build' ? '/Slide-Hub/' : '/',
  plugins: [react(), tailwind()],
}))
