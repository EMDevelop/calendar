/** Pure time helpers shared by both processes. No Node, Electron or DOM. */

export const MINUTE_MS = 60_000
export const DAY_MS = 86_400_000

export function startOfLocalDay(now: Date): Date {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  return start
}

export function endOfLocalDay(now: Date): Date {
  const end = startOfLocalDay(now)
  end.setDate(end.getDate() + 1)
  return end
}

export function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

/** Milliseconds until the next wall-clock minute boundary. Always 1..60000. */
export function msUntilNextMinute(now: Date): number {
  const elapsed = now.getSeconds() * 1000 + now.getMilliseconds()
  return MINUTE_MS - elapsed
}

/** Whole minutes from `from` to `to`, rounded towards zero. */
export function minutesBetween(from: Date, to: Date): number {
  return Math.trunc((to.getTime() - from.getTime()) / MINUTE_MS)
}

/** Minutes until `iso` starts; negative once it has passed. Rounded up so that
 * "in 59 seconds" reads as 1 minute rather than 0. */
export function minutesUntil(now: Date, iso: string): number {
  const target = Date.parse(iso)
  if (Number.isNaN(target)) {
    return 0
  }
  return Math.ceil((target - now.getTime()) / MINUTE_MS)
}

export function isValidTimestamp(iso: string): boolean {
  return !Number.isNaN(Date.parse(iso))
}
