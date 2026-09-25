import { CHANNELS } from '../../../shared/ipc/channels.ts'
import type { MeetingJoiner } from '../../calendar/MeetingJoiner.ts'
import type { MeetingAlertWindow } from '../../windows/MeetingAlertWindow.ts'
import type { IpcRouter } from '../IpcRouter.ts'

export interface AlertHandlerDeps {
  readonly joiner: MeetingJoiner
  readonly alertWindow: MeetingAlertWindow
}

/** The alert sends an event id like any other window; main resolves the URL (§8.6). */
export function registerAlertHandlers(router: IpcRouter, deps: AlertHandlerDeps): void {
  router.handle(CHANNELS.alertJoin, async ({ eventId }) => {
    await deps.joiner.join(eventId)
    deps.alertWindow.close()
  })

  router.handle(CHANNELS.alertDismiss, () => {
    deps.alertWindow.close()
  })

  // Lets the user confirm the alert appears without waiting for a meeting,
  // which also reveals whether macOS is delivering notifications at all.
  router.handle(CHANNELS.alertTest, async () => {
    const now = new Date()
    const end = new Date(now.getTime() + 30 * 60_000)

    await deps.alertWindow.show({
      eventId: 'preview',
      title: 'Test alert',
      start: now.toISOString(),
      end: end.toISOString(),
      minutesRemaining: 30,
      canJoin: false,
    })
  })
}
