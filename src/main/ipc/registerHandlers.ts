import type { AccountService } from '../calendar/AccountService.ts'
import type { MeetingJoiner } from '../calendar/MeetingJoiner.ts'
import type { AppLogger } from '../infra/logger.ts'
import type { SettingsStore } from '../storage/SettingsStore.ts'
import type { SyncScheduler } from '../sync/SyncScheduler.ts'
import type { PreferencesService } from '../system/PreferencesService.ts'
import type { SettingsWindow } from '../windows/SettingsWindow.ts'
import type { WidgetWindow } from '../windows/WidgetWindow.ts'
import { IpcRouter } from './IpcRouter.ts'
import { registerAccountHandlers } from './handlers/accountHandlers.ts'
import { registerAgendaHandlers } from './handlers/agendaHandlers.ts'
import { registerSettingsHandlers } from './handlers/settingsHandlers.ts'
import { registerWindowHandlers } from './handlers/windowHandlers.ts'

/**
 * The one place channels are registered (docs/spec.md §4, §8.5).
 *
 * Nothing calls into this module: it subscribes to AgendaService and pushes
 * snapshots outward, which is what keeps "nothing knows about IPC" true (§5).
 */

export interface IpcDependencies {
  readonly joiner: MeetingJoiner
  readonly accounts: AccountService
  readonly widget: WidgetWindow
  readonly settingsWindow: SettingsWindow
  readonly settings: SettingsStore
  readonly preferences: PreferencesService
  readonly scheduler: SyncScheduler
  readonly devServerOrigin: string | null
  readonly logger: AppLogger
}

export function registerHandlers(deps: IpcDependencies): void {
  const router = new IpcRouter(deps.devServerOrigin, deps.logger.child('ipc'))

  registerAgendaHandlers(router, { joiner: deps.joiner })
  registerAccountHandlers(router, { accounts: deps.accounts })
  registerWindowHandlers(router, {
    widget: deps.widget,
    settingsWindow: deps.settingsWindow,
    settings: deps.settings,
    preferences: deps.preferences,
  })
  registerSettingsHandlers(router, {
    settings: deps.settings,
    preferences: deps.preferences,
    scheduler: deps.scheduler,
  })
}
