import { app } from 'electron'
import type { AppLogger } from '../infra/logger.ts'

/**
 * Launch at login (docs/spec.md §6). Only behaves properly for a packaged app
 * in /Applications, so it is a no-op in development (§10).
 */
export class LoginItem {
  constructor(private readonly logger: AppLogger) {}

  apply(enabled: boolean): void {
    if (!app.isPackaged) {
      this.logger.debug('skipping login item change in development')
      return
    }
    app.setLoginItemSettings({ openAtLogin: enabled })
  }

  isEnabled(): boolean {
    return app.getLoginItemSettings().openAtLogin
  }
}
