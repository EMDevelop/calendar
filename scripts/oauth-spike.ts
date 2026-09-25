import { spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

/**
 * Phase 0 go / no-go spike (docs/spec.md §9).
 *
 * Deliberately standalone: no app code, no Electron, nothing stored on disk.
 * It answers one question — can this Google Cloud OAuth client sign in to the
 * account you choose, list calendars, read today's events, and still work
 * after a restart?
 *
 *   cp .env.example .env.local   # fill in the desktop client id and secret
 *   npm run spike:oauth          # run once per account
 *
 * If the work account fails here, ask your Workspace admin to trust the
 * client id before building anything else.
 */

const SCOPE_EVENTS = 'https://www.googleapis.com/auth/calendar.events.readonly'
const SCOPE_CALENDAR_LIST = 'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
const SCOPES = [SCOPE_EVENTS, SCOPE_CALENDAR_LIST]

const CLIENT_ID = process.env['MAIN_VITE_GOOGLE_CLIENT_ID'] ?? ''
const CLIENT_SECRET = process.env['MAIN_VITE_GOOGLE_CLIENT_SECRET'] ?? ''

interface TokenResponse {
  readonly access_token?: string
  readonly refresh_token?: string
  readonly scope?: string
  readonly error?: string
  readonly error_description?: string
}

interface Listener {
  readonly redirectUri: string
  readonly code: Promise<string>
  close(): void
}

function base64Url(input: Buffer): string {
  return input.toString('base64url')
}

async function startListener(expectedState: string): Promise<Listener> {
  const server = createServer()

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject)
      resolve()
    })
  })

  const { port } = server.address() as AddressInfo
  const redirectUri = `http://127.0.0.1:${port}/callback`

  const code = new Promise<string>((resolve, reject) => {
    server.on('request', (request, response) => {
      const url = new URL(request.url ?? '/', redirectUri)
      if (url.pathname !== '/callback') {
        response.writeHead(404).end('Not found')
        return
      }

      response.writeHead(200, { 'content-type': 'text/plain' }).end('Done. Close this tab.')

      if (url.searchParams.get('state') !== expectedState) {
        reject(new Error('state mismatch'))
        return
      }

      const received = url.searchParams.get('code')
      if (!received) {
        reject(new Error(url.searchParams.get('error') ?? 'no code returned'))
        return
      }
      resolve(received)
    })
  })

  return {
    redirectUri,
    code,
    close: () => {
      server.close()
    },
  }
}

function buildConsentUrl(redirectUri: string, state: string, challenge: string): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES.join(' '))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  return (await response.json()) as TokenResponse
}

async function callApi(path: string, accessToken: string): Promise<unknown> {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`)
  }
  return await response.json()
}

async function reportCalendars(accessToken: string, granted: readonly string[]): Promise<void> {
  if (!granted.includes(SCOPE_CALENDAR_LIST)) {
    console.log('Calendar list: scope not granted, so the picker would be hidden')
    return
  }

  const list = (await callApi('users/me/calendarList?maxResults=250', accessToken)) as {
    items?: { id?: string; primary?: boolean }[]
  }
  const primary = list.items?.find((entry) => entry.primary)
  console.log(`Primary calendar: ${primary?.id ?? 'not found'}`)
  console.log(`Calendars visible: ${list.items?.length ?? 0}`)
}

async function reportTodaysEvents(accessToken: string): Promise<void> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const query = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  })
  const events = (await callApi(`calendars/primary/events?${query.toString()}`, accessToken)) as {
    items?: unknown[]
  }
  console.log(`Events today: ${events.items?.length ?? 0}`)
}

async function main(): Promise<void> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      'set MAIN_VITE_GOOGLE_CLIENT_ID and MAIN_VITE_GOOGLE_CLIENT_SECRET in .env.local',
    )
  }

  const state = base64Url(randomBytes(32))
  const verifier = base64Url(randomBytes(32))
  const challenge = base64Url(createHash('sha256').update(verifier).digest())

  const listener = await startListener(state)
  try {
    const consentUrl = buildConsentUrl(listener.redirectUri, state, challenge)
    console.log('\nOpening your browser to sign in. If it does not open, visit:\n')
    console.log(`${consentUrl}\n`)
    spawn('open', [consentUrl], { stdio: 'ignore', detached: true }).unref()

    const code = await listener.code
    const tokens = await postToken({
      code,
      code_verifier: verifier,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: listener.redirectUri,
      grant_type: 'authorization_code',
    })

    if (tokens.error) {
      throw new Error(`${tokens.error}: ${tokens.error_description ?? ''}`)
    }

    const granted = (tokens.scope ?? '').split(' ').filter((scope) => scope.length > 0)
    console.log('\nGranted scopes:')
    for (const scope of granted) {
      console.log(`  ${scope}`)
    }
    if (!granted.includes(SCOPE_EVENTS)) {
      throw new Error('the calendar events permission was not granted')
    }

    const accessToken = tokens.access_token ?? ''
    await reportCalendars(accessToken, granted)
    await reportTodaysEvents(accessToken)

    if (!tokens.refresh_token) {
      throw new Error('no refresh token returned; check the consent screen is "In production"')
    }

    const refreshed = await postToken({
      refresh_token: tokens.refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
    })
    console.log(
      refreshed.access_token
        ? '\nRefresh works: a restart would not need re-authorising.'
        : `\nRefresh FAILED: ${refreshed.error ?? 'unknown error'}`,
    )

    console.log('\nRun this again with your other account to finish the Phase 0 check.')
  } finally {
    listener.close()
  }
}

main().catch((error: unknown) => {
  console.error('\nSpike failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
