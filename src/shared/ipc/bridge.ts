import type { AgendaSnapshot } from '../types/agenda.ts'
import type { AccountView } from '../types/account.ts'
import type { CalendarId, CalendarSummary } from '../types/calendar.ts'
import type { AppSettings, DisplayOption } from '../types/settings.ts'
import type { MeetingAlert, MoveToDisplayRequest, UpdateSettingsRequest } from './contract.ts'

/**
 * The only surfaces a renderer can reach. Each preload exposes exactly one of
 * these — no generic invoke passthrough (docs/spec.md §8.5).
 */

export interface WidgetBridge {
  /** Returns an unsubscribe function. */
  onSnapshot(listener: (snapshot: AgendaSnapshot) => void): () => void
  join(eventId: string): Promise<void>
  hide(): Promise<void>
  setPinned(pinned: boolean): Promise<void>
  openSettings(): Promise<void>
  syncNow(): Promise<void>
}

export interface SettingsBridge {
  listAccounts(): Promise<AccountView[]>
  connectAccount(): Promise<AccountView[]>
  reconnectAccount(accountId: string): Promise<AccountView[]>
  disconnectAccount(accountId: string): Promise<AccountView[]>
  updateAccount(request: {
    accountId: string
    label?: string
    colour?: string
  }): Promise<AccountView[]>
  listCalendars(accountId: string): Promise<CalendarSummary[]>
  setSelectedCalendars(accountId: string, calendarIds: CalendarId[]): Promise<AccountView[]>
  listDisplays(): Promise<DisplayOption[]>
  moveToDisplay(request: MoveToDisplayRequest): Promise<void>
  getSettings(): Promise<AppSettings>
  updateSettings(patch: UpdateSettingsRequest): Promise<AppSettings>
  syncNow(): Promise<void>
  /** Shows a sample alert, so notification setup can be checked. */
  testAlert(): Promise<void>
}

export interface AlertBridge {
  /** Returns an unsubscribe function. */
  onAlert(listener: (alert: MeetingAlert) => void): () => void
  join(eventId: string): Promise<void>
  dismiss(): Promise<void>
}

declare global {
  interface Window {
    readonly widgetApi?: WidgetBridge
    readonly settingsApi?: SettingsBridge
    readonly alertApi?: AlertBridge
  }
}
