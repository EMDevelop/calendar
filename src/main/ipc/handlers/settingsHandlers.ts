import { CHANNELS } from '../../../shared/ipc/channels.ts'
import type { SettingsStore } from '../../storage/SettingsStore.ts'
import type { SyncScheduler } from '../../sync/SyncScheduler.ts'
import type { PreferencesService } from '../../system/PreferencesService.ts'
import type { IpcRouter } from '../IpcRouter.ts'

export interface SettingsHandlerDeps {
  readonly settings: SettingsStore
  readonly preferences: PreferencesService
  readonly scheduler: SyncScheduler
}

export function registerSettingsHandlers(router: IpcRouter, deps: SettingsHandlerDeps): void {
  router.handle(CHANNELS.settingsGet, () => deps.settings.getSettings())

  router.handle(CHANNELS.settingsUpdate, (patch) => deps.preferences.update(patch))

  router.handle(CHANNELS.syncNow, () => {
    deps.scheduler.syncAllNow('manual')
  })
}
