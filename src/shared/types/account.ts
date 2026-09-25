import type { ACCOUNT_COLOURS } from '../constants.ts'
import type { AccountId, CalendarId, ProviderKind } from './calendar.ts'

export type AccountColour = (typeof ACCOUNT_COLOURS)[number]

/**
 * `needsReauth` is terminal until the user acts: the refresh token is dead and
 * retrying would only spin (§7).
 */
export type AccountStatus = 'ready' | 'syncing' | 'offline' | 'needsReauth'

export interface AccountConfig {
  readonly id: AccountId
  readonly provider: ProviderKind
  readonly label: string
  readonly colour: AccountColour
  /** Empty means the primary calendar only (§3). */
  readonly calendarIds: readonly CalendarId[]
}

/** What the settings window is allowed to see about an account. */
export interface AccountView {
  readonly id: AccountId
  readonly provider: ProviderKind
  readonly label: string
  readonly colour: AccountColour
  readonly status: AccountStatus
  readonly calendarIds: readonly CalendarId[]
  readonly lastSyncedAt: string | null
  /** False when the account was connected without the calendar-list scope (§8.3). */
  readonly canListCalendars: boolean
}
