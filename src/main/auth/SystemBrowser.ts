import { shell } from 'electron'
import { AuthFlowError } from '../infra/errors.ts'

/**
 * Opens the consent page in the user's default browser (docs/spec.md §8.3).
 *
 * Google blocks sign-in from embedded browsers, and the system browser brings
 * the existing session, SSO and passkeys. The app never sees the password.
 */

const ALLOWED_CONSENT_HOSTS: readonly string[] = ['accounts.google.com']

export class SystemBrowser {
  async openConsentPage(url: string): Promise<void> {
    const parsed = this.parseConsentUrl(url)
    await shell.openExternal(parsed)
  }

  /** Belt and braces: main builds this URL, and main also checks it. */
  private parseConsentUrl(candidate: string): string {
    let url: URL
    try {
      url = new URL(candidate)
    } catch {
      throw new AuthFlowError('exchange_failed', 'malformed consent URL')
    }

    const isHttps = url.protocol === 'https:'
    const isAllowedHost = ALLOWED_CONSENT_HOSTS.includes(url.hostname.toLowerCase())
    if (!isHttps || !isAllowedHost) {
      throw new AuthFlowError('exchange_failed', 'consent URL host is not allowed')
    }

    return url.toString()
  }
}
