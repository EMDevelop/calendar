import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS } from '../shared/ipc/channels.ts'
import type { SettingsBridge } from '../shared/ipc/bridge.ts'
import type { MoveToDisplayRequest, UpdateSettingsRequest } from '../shared/ipc/contract.ts'
import type { AccountView } from '../shared/types/account.ts'
import type { CalendarId, CalendarSummary } from '../shared/types/calendar.ts'
import type { AppSettings, DisplayOption } from '../shared/types/settings.ts'

/**
 * The settings window's surface (docs/spec.md §8.5). Separate from the
 * widget's, so neither window can reach the other's operations.
 */
const api: SettingsBridge = {
  listAccounts: () => ipcRenderer.invoke(CHANNELS.accountsList) as Promise<AccountView[]>,

  connectAccount: () =>
    ipcRenderer.invoke(CHANNELS.accountsConnect, { provider: 'google' }) as Promise<AccountView[]>,

  reconnectAccount: (accountId: string) =>
    ipcRenderer.invoke(CHANNELS.accountsReconnect, { accountId }) as Promise<AccountView[]>,

  disconnectAccount: (accountId: string) =>
    ipcRenderer.invoke(CHANNELS.accountsDisconnect, { accountId }) as Promise<AccountView[]>,

  updateAccount: (request: { accountId: string; label?: string; colour?: string }) =>
    ipcRenderer.invoke(CHANNELS.accountsUpdate, request) as Promise<AccountView[]>,

  listCalendars: (accountId: string) =>
    ipcRenderer.invoke(CHANNELS.calendarsList, { accountId }) as Promise<CalendarSummary[]>,

  setSelectedCalendars: (accountId: string, calendarIds: CalendarId[]) =>
    ipcRenderer.invoke(CHANNELS.calendarsSetSelected, {
      accountId,
      calendarIds,
    }) as Promise<AccountView[]>,

  listDisplays: () => ipcRenderer.invoke(CHANNELS.displaysList) as Promise<DisplayOption[]>,

  moveToDisplay: (request: MoveToDisplayRequest) =>
    ipcRenderer.invoke(CHANNELS.widgetMoveToDisplay, request) as Promise<void>,

  getSettings: () => ipcRenderer.invoke(CHANNELS.settingsGet) as Promise<AppSettings>,

  updateSettings: (patch: UpdateSettingsRequest) =>
    ipcRenderer.invoke(CHANNELS.settingsUpdate, patch) as Promise<AppSettings>,

  syncNow: () => ipcRenderer.invoke(CHANNELS.syncNow) as Promise<void>,
}

contextBridge.exposeInMainWorld('settingsApi', api)
