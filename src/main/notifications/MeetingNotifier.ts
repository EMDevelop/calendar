import { Notification } from 'electron'
import { PRIVACY_PLACEHOLDER_TITLE } from '../../shared/constants.ts'
import type { AgendaItem, AgendaSnapshot } from '../../shared/types/agenda.ts'
import type { MeetingJoiner } from '../calendar/MeetingJoiner.ts'
import type { AppLogger } from '../infra/logger.ts'
import type { SettingsStore } from '../storage/SettingsStore.ts'

/**
 * "Starts in a minute" (docs/spec.md §6).
 *
 * Fires once per event instance however often the event is re-synced, and
 * never for all-day events or ones that already started.
 */
export class MeetingNotifier {
  private readonly notified = new Set<string>()

  constructor(
    private readonly settings: SettingsStore,
    private readonly joiner: MeetingJoiner,
    private readonly showWidget: () => void,
    private readonly logger: AppLogger,
  ) {}

  handleSnapshot(snapshot: AgendaSnapshot): void {
    const lead = this.settings.getSettings().notificationLeadMinutes
    if (lead === null) {
      return
    }
    if (!Notification.isSupported()) {
      return
    }

    this.forgetStaleKeys(snapshot)

    for (const item of snapshot.timed) {
      if (!this.isDue(item, lead)) {
        continue
      }
      const key = this.keyFor(item)
      if (this.notified.has(key)) {
        continue
      }
      this.notified.add(key)
      this.show(item, snapshot.privacyMode)
    }
  }

  private isDue(item: AgendaItem, leadMinutes: number): boolean {
    if (item.isAllDay || item.status === 'past' || item.status === 'live') {
      return false
    }
    // Zero is "starting this minute"; negative means it already began.
    return item.startsInMinutes >= 0 && item.startsInMinutes <= leadMinutes
  }

  private show(item: AgendaItem, privacyMode: boolean): void {
    const minutes = item.startsInMinutes
    const body = minutes <= 0 ? 'Starting now' : `Starts in ${minutes} min`

    const notification = new Notification({
      // In privacy mode the title was already replaced in main (§6).
      title: privacyMode ? PRIVACY_PLACEHOLDER_TITLE : item.title,
      body,
      silent: false,
    })

    notification.on('click', () => {
      if (!item.canJoin) {
        this.showWidget()
        return
      }
      void this.joiner.join(item.id)
    })

    notification.show()
    this.logger.info('showed meeting notification', { minutes })
  }

  /** Keeps the set bounded and lets tomorrow's instance notify again. */
  private forgetStaleKeys(snapshot: AgendaSnapshot): void {
    const live = new Set(snapshot.timed.map((item) => this.keyFor(item)))
    for (const key of this.notified) {
      if (!live.has(key)) {
        this.notified.delete(key)
      }
    }
  }

  private keyFor(item: AgendaItem): string {
    return `${item.id}@${item.start}`
  }
}
