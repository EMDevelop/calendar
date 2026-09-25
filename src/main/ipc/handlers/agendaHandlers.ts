import { CHANNELS } from '../../../shared/ipc/channels.ts'
import type { MeetingJoiner } from '../../calendar/MeetingJoiner.ts'
import type { IpcRouter } from '../IpcRouter.ts'

export interface AgendaHandlerDeps {
  readonly joiner: MeetingJoiner
}

/** The renderer sends an event id; main resolves the URL itself (§8.6). */
export function registerAgendaHandlers(router: IpcRouter, deps: AgendaHandlerDeps): void {
  router.handle(CHANNELS.agendaJoin, async ({ eventId }) => {
    await deps.joiner.join(eventId)
  })
}
