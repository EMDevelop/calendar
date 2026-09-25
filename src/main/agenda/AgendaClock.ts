import { isSameLocalDay, msUntilNextMinute } from '../../shared/time.ts'
import { Signal } from '../infra/Signal.ts'

export interface ClockTick {
  readonly now: Date
  /** True on the first tick after local midnight, which rolls the agenda over (§7). */
  readonly dayChanged: boolean
}

/**
 * The single source of "now" in the app (docs/spec.md §5).
 *
 * Ticks on the wall-clock minute boundary rather than every 60s, so the
 * countdown changes when the clock does. Timers do not run while the machine
 * sleeps, which is why waking forces a tick.
 */
export class AgendaClock {
  readonly ticked = new Signal<ClockTick>()

  private timer: NodeJS.Timeout | null = null
  private lastTickAt: Date

  constructor(private readonly now: () => Date = () => new Date()) {
    this.lastTickAt = this.now()
  }

  start(): void {
    if (this.timer) {
      return
    }
    this.scheduleNext()
  }

  stop(): void {
    if (!this.timer) {
      return
    }
    clearTimeout(this.timer)
    this.timer = null
  }

  /** Used on wake and unlock, when the scheduled tick may be long overdue. */
  forceTick(): void {
    this.tick()
    if (this.timer) {
      this.scheduleNext()
    }
  }

  private scheduleNext(): void {
    if (this.timer) {
      clearTimeout(this.timer)
    }
    this.timer = setTimeout(() => {
      this.tick()
      this.scheduleNext()
    }, msUntilNextMinute(this.now()))
  }

  private tick(): void {
    const current = this.now()
    const dayChanged = !isSameLocalDay(current, this.lastTickAt)
    this.lastTickAt = current
    this.ticked.emit({ now: current, dayChanged })
  }
}
