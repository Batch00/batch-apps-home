import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Two HTML pages, one app: wrap.html only differs in its title and share-preview tags, and is
// served for /<year> (vercel.json). Both load the same main.jsx, which picks home or wrap by path.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        wrap: resolve(import.meta.dirname, 'wrap.html'),
      },
    },
  },
})
