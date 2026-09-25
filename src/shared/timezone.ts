/**
 * Time zone helpers (docs/spec.md §6).
 *
 * Positions on the timeline are epoch milliseconds, so a second time zone
 * changes only the labels. Everything here is formatting.
 */

/** The zone the Mac is set to. */
export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** True for an IANA name the runtime actually knows, e.g. `Europe/London`. */
export function isValidTimeZone(candidate: string): boolean {
  if (candidate.length === 0) {
    return false
  }
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: candidate })
    return true
  } catch {
    return false
  }
}

/**
 * A short label for a column header: "CEST", "BST", or a GMT offset where the
 * runtime has no abbreviation.
 */
export function timeZoneLabel(timeZone: string, at: Date): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(at)

    const name = parts.find((part) => part.type === 'timeZoneName')?.value
    if (name && name.length > 0) {
      return name
    }
  } catch {
    // Fall through to the city name below.
  }

  return cityOf(timeZone)
}

/** `Europe/Madrid` becomes `Madrid`, for when no abbreviation is available. */
export function cityOf(timeZone: string): string {
  const tail = timeZone.split('/').at(-1) ?? timeZone
  return tail.replace(/_/g, ' ')
}

/**
 * Zones the runtime supports, for the picker. Falls back to a short list if
 * the engine does not expose the full set.
 */
export function supportedTimeZones(): string[] {
  const supported = Intl.supportedValuesOf?.('timeZone')
  if (supported && supported.length > 0) {
    return [...supported]
  }
  return ['Europe/London', 'Europe/Madrid', 'Europe/Berlin', 'America/New_York', 'UTC']
}
