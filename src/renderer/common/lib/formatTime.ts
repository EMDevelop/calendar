const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
})

export function formatClockTime(iso: string): string {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) {
    return '--:--'
  }
  return timeFormatter.format(new Date(parsed))
}

/** Short enough for a narrow column: "4m", "2h 10m", "now". */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) {
    return 'now'
  }
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}

export function formatRelativeSync(iso: string | null, nowIso: string): string {
  if (!iso) {
    return 'not synced yet'
  }
  const then = Date.parse(iso)
  const now = Date.parse(nowIso)
  if (Number.isNaN(then) || Number.isNaN(now)) {
    return 'not synced yet'
  }

  const minutes = Math.max(0, Math.floor((now - then) / 60_000))
  if (minutes === 0) {
    return 'synced just now'
  }
  return `synced ${formatDuration(minutes)} ago`
}
