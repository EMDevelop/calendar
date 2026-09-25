import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const projectRoot = import.meta.dirname

export default defineConfig({
  resolve: {
    alias: {
      // Main-process modules import Electron; the tests run in plain Node.
      electron: resolve(projectRoot, 'tests/mocks/electron.ts'),
      'electron-log/main': resolve(projectRoot, 'tests/mocks/electron-log.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
