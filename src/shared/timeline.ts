import { startOfLocalDay } from './time.ts'

/**
 * Pure layout maths for the day timeline (docs/spec.md §6).
 *
 * The widget answers "how far through the day am I" by drawing time to scale,
 * so every position here is a ratio of the visible window rather than a pixel
 * value. Keeping it pure means the rules are testable without a DOM.
 */

export interface DayWindow {
  readonly startMs: number
  readonly endMs: number
}

export interface TimedBlock {
  readonly start: string
  readonly end: string
  readonly isAllDay: boolean
}

export interface DayWindowPreferences {
  readonly startHour: number
  readonly endHour: number
}

/** Positions are ratios in 0..1 of the window height. */
export interface BlockPosition {
  readonly top: number
  readonly height: number
}

export interface TimelineTick {
  readonly ms: number
  /** True on the hour; half-hour ticks are drawn more faintly. */
  readonly major: boolean
}

export const TICK_STEP_MINUTES = 30

const MINUTE_MS = 60_000
const HALF_HOUR_MS = 30 * MINUTE_MS

/**
 * The span of time the widget draws. Starts from the configured working hours,
 * then widens so that "now" and every timed event are always visible — a
 * meeting at 06:00 must not fall off the top of the window.
 */
export function resolveDayWindow(
  now: Date,
  items: readonly TimedBlock[],
  preferences: DayWindowPreferences,
): DayWindow {
  const dayStart = startOfLocalDay(now).getTime()
  const dayEnd = dayStart + 24 * 60 * MINUTE_MS

  const startHour = clampHour(preferences.startHour)
  const endHour = Math.max(clampHour(preferences.endHour), startHour + 1)

  let start = dayStart + startHour * 60 * MINUTE_MS
  let end = dayStart + endHour * 60 * MINUTE_MS

  const nowMs = now.getTime()
  if (nowMs >= dayStart && nowMs <= dayEnd) {
    start = Math.min(start, floorToStep(nowMs))
    end = Math.max(end, ceilToStep(nowMs))
  }

  for (const item of items) {
    if (item.isAllDay) {
      continue
    }
    const itemStart = Date.parse(item.start)
    const itemEnd = Date.parse(item.end)
    if (!Number.isNaN(itemStart)) {
      start = Math.min(start, floorToStep(itemStart))
    }
    if (!Number.isNaN(itemEnd)) {
      end = Math.max(end, ceilToStep(itemEnd))
    }
  }

  // Never draw beyond the day itself; an event running past midnight is cut
  // at the boundary rather than stretching the whole scale.
  return {
    startMs: Math.max(dayStart, Math.min(start, dayEnd - HALF_HOUR_MS)),
    endMs: Math.min(dayEnd, Math.max(end, start + HALF_HOUR_MS)),
  }
}

/** Where an instant sits in the window, clamped to 0..1. */
export function ratioFor(ms: number, window: DayWindow): number {
  const span = window.endMs - window.startMs
  if (span <= 0) {
    return 0
  }
  return clamp01((ms - window.startMs) / span)
}

/**
 * Where a block sits and how tall it is, both as ratios. Events that start
 * before or end after the window are clipped to it.
 */
export function blockFor(item: TimedBlock, window: DayWindow): BlockPosition {
  const start = Date.parse(item.start)
  const end = Date.parse(item.end)
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return { top: 0, height: 0 }
  }

  const top = ratioFor(start, window)
  const bottom = ratioFor(Math.max(end, start), window)
  return { top, height: Math.max(0, bottom - top) }
}

/** Grid lines every half hour, starting at the first boundary in the window. */
export function buildTicks(window: DayWindow, stepMinutes = TICK_STEP_MINUTES): TimelineTick[] {
  const step = Math.max(1, stepMinutes) * MINUTE_MS
  const ticks: TimelineTick[] = []

  for (let ms = ceilTo(window.startMs, step); ms <= window.endMs; ms += step) {
    const date = new Date(ms)
    ticks.push({ ms, major: date.getMinutes() === 0 })
  }

  return ticks
}

export interface LaneAssignment<T> {
  readonly item: T
  /** Zero-based column within this item's overlapping cluster. */
  readonly lane: number
  /** How many columns that cluster needs. */
  readonly laneCount: number
}

/**
 * Side-by-side columns for overlapping events, so a double-booking is visible
 * rather than one meeting hiding another. Events that do not overlap reuse
 * the same column and stay full width.
 */
export function assignLanes<T extends TimedBlock>(items: readonly T[]): LaneAssignment<T>[] {
  const sorted = [...items]
    .filter((item) => !item.isAllDay)
    .sort((left, right) => Date.parse(left.start) - Date.parse(right.start))

  const assignments: { item: T; lane: number; clusterIndex: number }[] = []
  const clusterSizes: number[] = []

  let laneEnds: number[] = []
  let clusterIndex = -1
  let clusterEnd = Number.NEGATIVE_INFINITY

  for (const item of sorted) {
    const start = Date.parse(item.start)
    const end = Math.max(Date.parse(item.end), start)

    // A gap with no overlap closes the cluster and resets the columns.
    if (start >= clusterEnd) {
      clusterIndex += 1
      clusterSizes.push(0)
      laneEnds = []
      clusterEnd = Number.NEGATIVE_INFINITY
    }

    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) {
      lane = laneEnds.length
    }
    laneEnds[lane] = end

    clusterSizes[clusterIndex] = Math.max(clusterSizes[clusterIndex] ?? 0, laneEnds.length)
    clusterEnd = Math.max(clusterEnd, end)
    assignments.push({ item, lane, clusterIndex })
  }

  return assignments.map(({ item, lane, clusterIndex: index }) => ({
    item,
    lane,
    laneCount: clusterSizes[index] ?? 1,
  }))
}

function clampHour(hour: number): number {
  if (!Number.isFinite(hour)) {
    return 0
  }
  return Math.min(23, Math.max(0, Math.trunc(hour)))
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function floorToStep(ms: number): number {
  return Math.floor(ms / HALF_HOUR_MS) * HALF_HOUR_MS
}

function ceilToStep(ms: number): number {
  return Math.ceil(ms / HALF_HOUR_MS) * HALF_HOUR_MS
}

function ceilTo(ms: number, step: number): number {
  return Math.ceil(ms / step) * step
}
