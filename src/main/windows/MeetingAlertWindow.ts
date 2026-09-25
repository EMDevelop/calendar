import { BrowserWindow, screen } from 'electron'
import { CHANNELS } from '../../shared/ipc/channels.ts'
import type { MeetingAlert } from '../../shared/ipc/contract.ts'
import type { AppLogger } from '../infra/logger.ts'
import { resolveRendererUrl } from './appProtocol.ts'
import { applyWindowSecurity, hardenedWebPreferences } from './windowSecurity.ts'

/**
 * The centre-screen "this is starting now" alert (docs/spec.md §6).
 *
 * macOS notifications are easy to miss: they appear top-right, fade after a
 * few seconds, and are silently dropped when the app has not been granted
 * permission. A window we own is unmissable and works regardless.
 *
 * It still follows the peripheral rule (§2): it appears without taking
 * keyboard focus, so it cannot swallow what you are typing.
 */

const WIDTH = 380
const HEIGHT = 168
/** Long enough to notice, short enough not to linger if you are already in. */
const AUTO_DISMISS_MS = 90_000

export interface MeetingAlertWindowOptions {
  readonly preloadPath: string
  readonly devServerUrl: string | null
  readonly isDev: boolean
}

export class MeetingAlertWindow {
  private window: BrowserWindow | null = null
  private dismissTimer: NodeJS.Timeout | null = null

  constructor(
    private readonly options: MeetingAlertWindowOptions,
    private readonly logger: AppLogger,
  ) {}

  async show(alert: MeetingAlert): Promise<void> {
    // A second meeting starting replaces the first rather than stacking.
    this.close()

    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const area = display.workArea
    const window = new BrowserWindow({
      width: WIDTH,
      height: HEIGHT,
      x: Math.round(area.x + (area.width - WIDTH) / 2),
      y: Math.round(area.y + (area.height - HEIGHT) / 2),
      // Same panel behaviour as the widget: over full-screen apps, every
      // Space, and never activating.
      type: 'panel',
      frame: false,
      show: false,
      resizable: false,
      movable: true,
      skipTaskbar: true,
      fullscreenable: false,
      alwaysOnTop: true,
      acceptFirstMouse: true,
      webPreferences: hardenedWebPreferences({
        preloadPath: this.options.preloadPath,
        isDev: this.options.isDev,
      }),
    })

    this.window = window
    applyWindowSecurity(window, this.logger)
    window.setContentProtection(true)
    window.setAlwaysOnTop(true, 'screen-saver')

    window.on('closed', () => {
      this.window = null
    })

    window.once('ready-to-show', () => {
      window.showInactive()
      window.webContents.send(CHANNELS.alertShow, alert)
    })

    await window.loadURL(resolveRendererUrl('alert', this.options.devServerUrl))

    this.dismissTimer = setTimeout(() => {
      this.close()
    }, AUTO_DISMISS_MS)

    this.logger.info('showed meeting alert', { canJoin: alert.canJoin })
  }

  close(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer)
      this.dismissTimer = null
    }
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy()
    }
    this.window = null
  }
}
