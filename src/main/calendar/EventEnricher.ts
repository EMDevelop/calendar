import {
  IMMINENT_THRESHOLD_MINUTES,
  MAX_EVENT_TITLE_LENGTH,
  PRIVACY_PLACEHOLDER_TITLE,
} from '../../shared/constants.ts'
import { minutesBetween, minutesUntil } from '../../shared/time.ts'
import type { AccountColour } from '../../shared/types/account.ts'
import type { AgendaItem, EventStatus } from '../../shared/types/agenda.ts'
import type { CalendarEvent } from '../../shared/types/calendar.ts'

/**
 * Pure: how an event looks at a given instant (docs/spec.md §4).
 *
 * `now` is a parameter, never `new Date()`, so every rule here is testable and
 * the tray, the widget and notifications can never disagree.
 */

export interface EnrichmentContext {
  readonly now: Date
  readonly colour: AccountColour
  readonly privacyMode: boolean
}

export function statusFor(event: CalendarEvent, now: Date): EventStatus {
  // All-day events are context, not urgency: never live, never imminent (§6).
  if (event.isAllDay) {
    return 'upcoming'
  }

  const start = Date.parse(event.start)
  const end = Date.parse(event.end)
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 'upcoming'
  }

  const current = now.getTime()
  if (end <= current) {
    return 'past'
  }
  if (start <= current) {
    return 'live'
  }
  if (minutesUntil(now, event.start) <= IMMINENT_THRESHOLD_MINUTES) {
    return 'imminent'
  }
  return 'upcoming'
}

export function toAgendaItem(event: CalendarEvent, context: EnrichmentContext): AgendaItem {
  const end = new Date(Date.parse(event.end))

  return {
    id: event.id,
    accountId: event.accountId,
    colour: context.colour,
    title: displayTitle(event.title, context.privacyMode),
    start: event.start,
    end: event.end,
    isAllDay: event.isAllDay,
    status: statusFor(event, context.now),
    startsInMinutes: minutesUntil(context.now, event.start),
    minutesRemaining: Number.isNaN(end.getTime()) ? 0 : minutesBetween(context.now, end),
    canJoin: typeof event.conferenceUrl === 'string' && event.conferenceUrl.length > 0,
  }
}

/**
 * In privacy mode the real title is replaced here, in main, so it never reaches
 * the renderer, the menu bar or a notification (§6, §8.4).
 */
function displayTitle(title: string, privacyMode: boolean): string {
  if (privacyMode) {
    return PRIVACY_PLACEHOLDER_TITLE
  }
  const trimmed = title.trim()
  if (trimmed.length === 0) {
    return '(no title)'
  }
  return trimmed.slice(0, MAX_EVENT_TITLE_LENGTH)
}

/** The next event worth counting down to: live first, then the soonest to start. */
export function findNextUp(items: readonly AgendaItem[]): AgendaItem | null {
  const live = items.find((item) => item.status === 'live' && !item.isAllDay)
  if (live) {
    return live
  }
  const upcoming = items.find((item) => !item.isAllDay && item.status !== 'past')
  return upcoming ?? null
}
