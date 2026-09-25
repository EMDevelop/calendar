import { shell } from 'electron'
import type { EventId } from '../../shared/types/calendar.ts'
import type { AgendaService } from '../agenda/AgendaService.ts'
import { describeError } from '../infra/errors.ts'
import type { AppLogger } from '../infra/logger.ts'
import { parseAllowedUrl } from './conferenceLinks.ts'

/**
 * The only path that opens a meeting link (docs/spec.md §8.6).
 *
 * The renderer and the notification both send an event id; main resolves the
 * URL from its own state and re-checks the allowlist before opening. A URL
 * from outside main can never reach shell.openExternal.
 */
export class MeetingJoiner {
  constructor(
    private readonly agenda: AgendaService,
    private readonly logger: AppLogger,
  ) {}

  async join(eventId: EventId): Promise<boolean> {
    const stored = this.agenda.findConferenceUrl(eventId)
    if (!stored) {
      this.logger.warn('join requested for an event with no meeting link')
      return false
    }

    // Checked at mapping time and again here: the allowlist is the gate, and
    // it is cheap to pass through twice.
    const safeUrl = parseAllowedUrl(stored)
    if (!safeUrl) {
      this.logger.warn('refused to open a meeting link that is not on the allowlist')
      return false
    }

    try {
      await shell.openExternal(safeUrl)
      return true
    } catch (error) {
      this.logger.error('could not open meeting link', { error: describeError(error) })
      return false
    }
  }
}
