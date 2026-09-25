import { Notification } from 'electron'
import { PRIVACY_PLACEHOLDER_TITLE } from '../../shared/constants.ts'
import type { MeetingAlert } from '../../shared/ipc/contract.ts'
import type { AgendaItem, AgendaSnapshot } from '../../shared/types/agenda.ts'
import type { MeetingJoiner } from '../calendar/MeetingJoiner.ts'
import type { AppLogger } from '../infra/logger.ts'
import type { SettingsReader } from '../storage/SettingsStore.ts'

/**
 * Two moments matter, and they are different (docs/spec.md §6):
 *
 * - a warning shortly before a meeting, so you can wrap up
 * - a prompt the moment it starts, so you can join without hunting for the link
 *
 * Each fires once per event instance, however often the event is re-synced.
 */

/**
 * How late a start prompt may still appear. Without this, launching the app
 * during a long meeting would announce something that began an hour ago.
 */
const START_GRACE_MINUTES = 2

export class MeetingNotifier {
  private readonly warned = new Set<string>()
  private readonly announced = new Set<string>()

  constructor(
    private readonly settings: SettingsReader,
    private readonly joiner: MeetingJoiner,
    private readonly showWidget: () => void,
    /** Shown centre-screen when a meeting starts; see MeetingAlertWindow. */
    private readonly showAlert: (alert: MeetingAlert) => void,
    private readonly logger: AppLogger,
  ) {}

  handleSnapshot(snapshot: AgendaSnapshot): void {
    const lead = this.settings.getSettings().notificationLeadMinutes
    if (lead === null || !Notification.isSupported()) {
      return
    }

    this.forgetStaleKeys(snapshot)

    for (const item of snapshot.timed) {
      if (item.isAllDay) {
        continue
      }
      this.maybeAnnounceStart(item, snapshot.privacyMode)
      this.maybeWarn(item, lead, snapshot.privacyMode)
    }
  }

  /** "Starts in N min", ahead of time. */
  private maybeWarn(item: AgendaItem, leadMinutes: number, privacyMode: boolean): void {
    // A lead of zero means "tell me when it starts", which the start prompt
    // already does; warning here too would double up.
    if (leadMinutes === 0 || item.status === 'past' || item.status === 'live') {
      return
    }
    if (item.startsInMinutes <= 0 || item.startsInMinutes > leadMinutes) {
      return
    }

    const key = this.keyFor(item)
    if (this.warned.has(key)) {
      return
    }
    this.warned.add(key)

    this.show({
      item,
      privacyMode,
      body: `Starts in ${item.startsInMinutes} min`,
      kind: 'warning',
    })
  }

  /** "In progress — join now", at the moment it begins. */
  private maybeAnnounceStart(item: AgendaItem, privacyMode: boolean): void {
    if (item.status !== 'live') {
      return
    }
    if (item.startsInMinutes > 0 || item.startsInMinutes < -START_GRACE_MINUTES) {
      return
    }

    const key = this.keyFor(item)
    if (this.announced.has(key)) {
      return
    }
    // A meeting only starts once, so the warning is moot from here on.
    this.announced.add(key)
    this.warned.add(key)

    this.show({
      item,
      privacyMode,
      body: item.canJoin ? 'Meeting in progress — join now' : 'Meeting in progress',
      kind: 'start',
    })

    // A system notification can be missed, or dropped entirely if macOS has
    // not granted permission, so the start is also raised as our own window.
    this.showAlert({
      eventId: item.id,
      title: privacyMode ? PRIVACY_PLACEHOLDER_TITLE : item.title,
      start: item.start,
      end: item.end,
      minutesRemaining: item.minutesRemaining,
      canJoin: item.canJoin,
    })
  }

  private show(options: {
    item: AgendaItem
    privacyMode: boolean
    body: string
    kind: 'warning' | 'start'
  }): void {
    const { item, privacyMode, body, kind } = options

    const notification = new Notification({
      // The title was already replaced in main if privacy mode is on (§6).
      title: privacyMode ? PRIVACY_PLACEHOLDER_TITLE : item.title,
      body,
      silent: false,
      // macOS shows this as a button; without a link there is nothing to press.
      actions: item.canJoin ? [{ type: 'button', text: 'Join' }] : [],
      closeButtonText: kind === 'start' ? 'Already in it' : 'Dismiss',
    })

    notification.on('action', () => {
      void this.joiner.join(item.id)
    })

    notification.on('click', () => {
      if (!item.canJoin) {
        this.showWidget()
        return
      }
      void this.joiner.join(item.id)
    })

    notification.show()
    this.logger.info('showed meeting notification', { kind, canJoin: item.canJoin })
  }

  /** Keeps the sets bounded and lets tomorrow's instance notify again. */
  private forgetStaleKeys(snapshot: AgendaSnapshot): void {
    const live = new Set(snapshot.timed.map((item) => this.keyFor(item)))
    for (const set of [this.warned, this.announced]) {
      for (const key of set) {
        if (!live.has(key)) {
          set.delete(key)
        }
      }
    }
  }

  private keyFor(item: AgendaItem): string {
    return `${item.id}@${item.start}`
  }
}
