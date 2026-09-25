import type { calendar_v3 } from '@googleapis/calendar'
import { MAX_EVENT_TITLE_LENGTH } from '../../../../shared/constants.ts'
import type { AccountId, CalendarEvent, CalendarId } from '../../../../shared/types/calendar.ts'
import { resolveConferenceUrl } from '../../conferenceLinks.ts'

/**
 * Google's shape to ours (docs/spec.md §3, §7).
 *
 * Data minimisation happens here: descriptions and attendees are read to find
 * a meeting link and your RSVP, then dropped. They are never stored, logged or
 * sent to the renderer.
 */

export interface MappingContext {
  readonly accountId: AccountId
  readonly calendarId: CalendarId
}

/** Returns null for events that should not be shown at all. */
export function mapGoogleEvent(
  raw: calendar_v3.Schema$Event,
  context: MappingContext,
): CalendarEvent | null {
  if (raw.status === 'cancelled') {
    return null
  }
  if (isDeclinedBySelf(raw)) {
    return null
  }

  const start = readTimestamp(raw.start)
  const end = readTimestamp(raw.end)
  if (!start || !end) {
    return null
  }

  const id = raw.id
  if (typeof id !== 'string' || id.length === 0) {
    return null
  }

  const conferenceUrl = findConferenceUrl(raw)

  return {
    id: `${context.accountId}:${context.calendarId}:${id}`,
    accountId: context.accountId,
    calendarId: context.calendarId,
    iCalUID: typeof raw.iCalUID === 'string' ? raw.iCalUID : '',
    title: readTitle(raw.summary),
    start: start.iso,
    end: end.iso,
    isAllDay: start.isAllDay,
    ...(conferenceUrl ? { conferenceUrl } : {}),
  }
}

export function mapGoogleEvents(
  items: readonly calendar_v3.Schema$Event[],
  context: MappingContext,
): CalendarEvent[] {
  const mapped: CalendarEvent[] = []
  for (const item of items) {
    const event = mapGoogleEvent(item, context)
    if (event) {
      mapped.push(event)
    }
  }
  return mapped
}

/** Titles come from anyone who can send you an invite, so they are bounded (§8.1). */
function readTitle(summary: string | null | undefined): string {
  if (typeof summary !== 'string') {
    return '(no title)'
  }
  const trimmed = summary.trim()
  if (trimmed.length === 0) {
    return '(no title)'
  }
  return trimmed.slice(0, MAX_EVENT_TITLE_LENGTH)
}

function isDeclinedBySelf(raw: calendar_v3.Schema$Event): boolean {
  const attendees = raw.attendees ?? []
  const self = attendees.find((attendee) => attendee.self === true)
  return self?.responseStatus === 'declined'
}

function readTimestamp(
  point: calendar_v3.Schema$EventDateTime | undefined,
): { iso: string; isAllDay: boolean } | null {
  if (!point) {
    return null
  }

  if (typeof point.dateTime === 'string' && point.dateTime.length > 0) {
    const parsed = Date.parse(point.dateTime)
    if (Number.isNaN(parsed)) {
      return null
    }
    return { iso: new Date(parsed).toISOString(), isAllDay: false }
  }

  // All-day events carry a bare YYYY-MM-DD, which must be read as local midnight.
  if (typeof point.date === 'string' && point.date.length > 0) {
    const localMidnight = parseLocalDate(point.date)
    if (!localMidnight) {
      return null
    }
    return { iso: localMidnight.toISOString(), isAllDay: true }
  }

  return null
}

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return null
  }
  const [, year, month, day] = match
  const parsed = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function findConferenceUrl(raw: calendar_v3.Schema$Event): string | undefined {
  const entryPoints = raw.conferenceData?.entryPoints ?? []
  const videoUris = entryPoints
    .filter((entry) => entry.entryPointType === 'video')
    .map((entry) => entry.uri)

  return resolveConferenceUrl({
    structured: [raw.hangoutLink, ...videoUris],
    text: [raw.location, raw.description],
  })
}
