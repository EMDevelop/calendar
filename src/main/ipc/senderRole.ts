import type { WindowRole } from '../../shared/ipc/channels.ts'
import { APP_SCHEME } from '../windows/appProtocol.ts'

const ROLES: readonly WindowRole[] = ['widget', 'settings']

/**
 * Which window a message came from, or null if it came from anywhere else
 * (docs/spec.md §8.5). Pure, so the rule is testable without Electron.
 */
export function roleForSenderUrl(
  rawUrl: string | undefined,
  devServerOrigin: string | null,
): WindowRole | null {
  if (!rawUrl) {
    return null
  }

  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  if (url.protocol === `${APP_SCHEME}:`) {
    return asRole(url.hostname)
  }

  // In development the renderer is served by Vite, where the role is the first
  // path segment.
  if (devServerOrigin && url.origin === devServerOrigin) {
    return asRole(url.pathname.split('/').filter((part) => part.length > 0)[0] ?? '')
  }

  return null
}

function asRole(candidate: string): WindowRole | null {
  return ROLES.find((role) => role === candidate) ?? null
}
