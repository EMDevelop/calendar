import type { AccountId, CalendarEvent } from '../../shared/types/calendar.ts'

/**
 * Pure: which events are shown, in what order (docs/spec.md §4).
 * How they look is EventEnricher's job.
 */

export function sortEvents(events: readonly CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((left, right) => {
    const byStart = Date.parse(left.start) - Date.parse(right.start)
    if (byStart !== 0) {
      return byStart
    }
    const byTitle = left.title.localeCompare(right.title)
    if (byTitle !== 0) {
      return byTitle
    }
    return left.id.localeCompare(right.id)
  })
}

/**
 * The same meeting invited to both your accounts appears once in merged view,
 * in the first account's colour (§7). Split view keeps both copies.
 */
export function dedupeForMergedView(
  events: readonly CalendarEvent[],
  accountOrder: readonly AccountId[],
): CalendarEvent[] {
  const rank = new Map(accountOrder.map((accountId, index) => [accountId, index]))
  const winners = new Map<string, CalendarEvent>()

  for (const event of events) {
    const key = dedupeKey(event)
    const existing = winners.get(key)
    if (!existing) {
      winners.set(key, event)
      continue
    }
    const existingRank = rank.get(existing.accountId) ?? Number.MAX_SAFE_INTEGER
    const candidateRank = rank.get(event.accountId) ?? Number.MAX_SAFE_INTEGER
    if (candidateRank < existingRank) {
      winners.set(key, event)
    }
  }

  return sortEvents([...winners.values()])
}

export function partitionByAllDay(events: readonly CalendarEvent[]): {
  timed: CalendarEvent[]
  allDay: CalendarEvent[]
} {
  const timed: CalendarEvent[] = []
  const allDay: CalendarEvent[] = []
  for (const event of events) {
    if (event.isAllDay) {
      allDay.push(event)
    } else {
      timed.push(event)
    }
  }
  return { timed, allDay }
}

/** Events without an iCalUID fall back to their own id, so they never merge. */
function dedupeKey(event: CalendarEvent): string {
  const uid = event.iCalUID.length > 0 ? event.iCalUID : event.id
  return `${uid}@${event.start}`
}
