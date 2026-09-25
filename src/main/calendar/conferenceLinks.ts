/**
 * Meeting-link allowlist (docs/spec.md §8.6).
 *
 * Invite text is attacker-controlled, so a link is only ever opened when it is
 * https on one of these hosts. Adding a host is a reviewed change to this file.
 */

const ALLOWED_HOSTS: readonly string[] = [
  'meet.google.com',
  'zoom.us',
  'teams.microsoft.com',
  'teams.live.com',
]

/** Hosts whose subdomains are also allowed (`acme.zoom.us`). */
const ALLOWED_SUFFIX_HOSTS: readonly string[] = ['zoom.us']

const URL_PATTERN = /https:\/\/[^\s<>"')]+/gi

export function isAllowedMeetingUrl(candidate: string): boolean {
  return parseAllowedUrl(candidate) !== null
}

/**
 * Returns the normalised URL when it is safe to open, otherwise null.
 * Rejects non-https schemes, embedded credentials and any host off the list.
 */
export function parseAllowedUrl(candidate: string): string | null {
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }

  if (url.protocol !== 'https:') {
    return null
  }
  // https://meet.google.com@evil.example is a different host; refuse the shape outright.
  if (url.username.length > 0 || url.password.length > 0) {
    return null
  }

  const host = url.hostname.toLowerCase()
  const exactMatch = ALLOWED_HOSTS.includes(host)
  const suffixMatch = ALLOWED_SUFFIX_HOSTS.some((allowed) => host.endsWith(`.${allowed}`))
  if (!exactMatch && !suffixMatch) {
    return null
  }

  return url.toString()
}

/**
 * Picks a meeting link for an event. Structured fields are preferred; free text
 * is only scanned as a fallback, and everything goes through the allowlist.
 */
export function resolveConferenceUrl(sources: {
  readonly structured?: readonly (string | null | undefined)[]
  readonly text?: readonly (string | null | undefined)[]
}): string | undefined {
  for (const candidate of sources.structured ?? []) {
    const allowed = candidate ? parseAllowedUrl(candidate) : null
    if (allowed) {
      return allowed
    }
  }

  for (const block of sources.text ?? []) {
    if (!block) {
      continue
    }
    const matches = block.match(URL_PATTERN) ?? []
    for (const match of matches) {
      const allowed = parseAllowedUrl(stripTrailingPunctuation(match))
      if (allowed) {
        return allowed
      }
    }
  }

  return undefined
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[.,;:!?]+$/, '')
}
