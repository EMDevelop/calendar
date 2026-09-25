import { appSettingsSchema } from '../../shared/ipc/contract.ts'
import {
  ACCOUNT_COLOURS,
  DEFAULT_NOTIFICATION_LEAD_MINUTES,
  DEFAULT_SYNC_INTERVAL_MINUTES,
} from '../../shared/constants.ts'
import type { AccountColour, AccountConfig } from '../../shared/types/account.ts'
import type { AppSettings } from '../../shared/types/settings.ts'

/**
 * The persisted shape. Settings and window state only — never secrets
 * (docs/spec.md §8.2).
 */
// A type alias, not an interface: electron-store's generic is constrained to
// Record<string, any>, which only structural type aliases satisfy.
export type PersistedState = {
  schemaVersion: number
  settings: AppSettings
}

export const CURRENT_SCHEMA_VERSION = 1

export const DEFAULT_SETTINGS: AppSettings = {
  viewMode: 'merged',
  theme: 'system',
  syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
  notificationLeadMinutes: DEFAULT_NOTIFICATION_LEAD_MINUTES,
  hideTitlesInMenuBar: false,
  privacyMode: false,
  launchAtLogin: false,
  alwaysOnTop: true,
  placement: { display: null, corner: 'topRight', bounds: null },
  accounts: [],
}

export const DEFAULT_STATE: PersistedState = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  settings: DEFAULT_SETTINGS,
}

/**
 * A corrupt or hand-edited settings file must not crash startup or, worse,
 * hand unvalidated values to the rest of the app.
 */
export function parseSettings(candidate: unknown): AppSettings {
  const result = appSettingsSchema.safeParse(candidate)
  if (!result.success) {
    return DEFAULT_SETTINGS
  }
  return result.data
}

/** Fixed rotation, first unused colour wins (§6). */
export function nextAccountColour(existing: readonly AccountConfig[]): AccountColour {
  const taken = new Set(existing.map((account) => account.colour))
  const free = ACCOUNT_COLOURS.find((colour) => !taken.has(colour))
  return free ?? ACCOUNT_COLOURS[existing.length % ACCOUNT_COLOURS.length]!
}
