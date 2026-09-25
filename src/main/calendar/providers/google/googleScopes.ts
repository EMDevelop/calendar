/**
 * The narrowest scopes that support today's agenda and the calendar picker
 * (docs/spec.md §8.3). Read-only: a leaked token cannot create, edit or delete
 * anything, and cannot reach Gmail or Drive.
 */

export const SCOPE_EVENTS_READONLY = 'https://www.googleapis.com/auth/calendar.events.readonly'
export const SCOPE_CALENDAR_LIST_READONLY =
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly'

export const REQUESTED_SCOPES: readonly string[] = [
  SCOPE_EVENTS_READONLY,
  SCOPE_CALENDAR_LIST_READONLY,
]

/** Google lets users untick scopes on the consent screen, so check what was granted. */
export function parseGrantedScopes(scope: string | null | undefined): readonly string[] {
  if (typeof scope !== 'string') {
    return []
  }
  return scope.split(' ').filter((entry) => entry.length > 0)
}

export function hasEventsScope(granted: readonly string[]): boolean {
  return granted.includes(SCOPE_EVENTS_READONLY)
}

export function hasCalendarListScope(granted: readonly string[]): boolean {
  return granted.includes(SCOPE_CALENDAR_LIST_READONLY)
}
