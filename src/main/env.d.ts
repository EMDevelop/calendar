/// <reference types="electron-vite/node" />

/**
 * Build-time values injected by electron-vite. Only infra/config.ts reads these
 * (docs/spec.md §4).
 */
interface ImportMetaEnv {
  readonly MAIN_VITE_GOOGLE_CLIENT_ID?: string
  readonly MAIN_VITE_GOOGLE_CLIENT_SECRET?: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
