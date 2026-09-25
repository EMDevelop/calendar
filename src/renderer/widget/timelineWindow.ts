import type { AgendaSnapshot } from '../../shared/types/agenda.ts'
import type { DayWindow } from '../../shared/timeline.ts'

/**
 * The window is resolved in main, which owns time (docs/spec.md §5); the
 * renderer only converts it to the millisecond form the layout maths uses.
 */
export function windowOf(snapshot: AgendaSnapshot): DayWindow {
  return {
    startMs: Date.parse(snapshot.window.start),
    endMs: Date.parse(snapshot.window.end),
  }
}
