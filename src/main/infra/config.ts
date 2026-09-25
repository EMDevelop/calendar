/**
 * The only reader of build-time environment values (docs/spec.md §4, §8.3).
 * Everything else receives typed config through its constructor.
 */

export interface GoogleOAuthConfig {
  readonly clientId: string
  readonly clientSecret: string
}

export interface AppConfig {
  readonly isDev: boolean
  /** Null when no OAuth client was built in; the app runs on mock data and the
   * settings window explains why connecting is unavailable. */
  readonly google: GoogleOAuthConfig | null
}

function readTrimmed(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function loadConfig(): AppConfig {
  const clientId = readTrimmed(import.meta.env.MAIN_VITE_GOOGLE_CLIENT_ID)
  const clientSecret = readTrimmed(import.meta.env.MAIN_VITE_GOOGLE_CLIENT_SECRET)
  const hasGoogleClient = clientId.length > 0 && clientSecret.length > 0

  return {
    isDev: import.meta.env.DEV,
    google: hasGoogleClient ? { clientId, clientSecret } : null,
  }
}
