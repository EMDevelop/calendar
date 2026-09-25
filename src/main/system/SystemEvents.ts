import { powerMonitor, screen } from 'electron'
import { Signal } from '../infra/Signal.ts'
import type { AppLogger } from '../infra/logger.ts'

/**
 * One emitter for the OS events that matter (docs/spec.md §7).
 *
 * Timers do not run while the machine sleeps, so waking and unlocking are
 * explicit sync triggers rather than something the scheduler can infer.
 */
export class SystemEvents {
  readonly resumed = new Signal<string>()
  readonly displaysChanged = new Signal<void>()

  private started = false

  constructor(private readonly logger: AppLogger) {}

  start(): void {
    if (this.started) {
      return
    }
    this.started = true

    powerMonitor.on('resume', () => {
      this.logger.info('machine resumed')
      this.resumed.emit('resume')
    })

    powerMonitor.on('unlock-screen', () => {
      this.resumed.emit('unlock')
    })

    screen.on('display-added', () => {
      this.displaysChanged.emit()
    })
    screen.on('display-removed', () => {
      this.displaysChanged.emit()
    })
    screen.on('display-metrics-changed', () => {
      this.displaysChanged.emit()
    })
  }
}
