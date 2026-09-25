import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

const projectRoot = import.meta.dirname

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: { index: resolve(projectRoot, 'src/main/index.ts') },
      },
    },
  },
  preload: {
    build: {
      externalizeDeps: false,
      rollupOptions: {
        input: {
          widget: resolve(projectRoot, 'src/preload/widget.ts'),
          settings: resolve(projectRoot, 'src/preload/settings.ts'),
        },
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {
    root: resolve(projectRoot, 'src/renderer'),
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: {
          widget: resolve(projectRoot, 'src/renderer/widget/index.html'),
          settings: resolve(projectRoot, 'src/renderer/settings/index.html'),
        },
      },
    },
  },
})
