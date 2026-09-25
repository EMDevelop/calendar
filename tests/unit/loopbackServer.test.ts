import { Agent, request } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { LoopbackServer } from '../../src/main/auth/LoopbackServer.ts'
import type { AppLogger } from '../../src/main/infra/logger.ts'

/**
 * The OAuth callback listener is the only port this app ever opens, so its
 * refusals matter as much as its successes (docs/spec.md §8.3).
 */

const silentLogger: AppLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger,
}

let server: LoopbackServer | null = null

afterEach(async () => {
  await server?.close()
  server = null
})

interface RawResponse {
  readonly status: number
}

/** A raw request so the Host header can be forged. */
function call(
  port: number,
  path: string,
  options: { method?: string; host?: string; agent?: Agent } = {},
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: options.method ?? 'GET',
        headers: { host: options.host ?? `127.0.0.1:${port}` },
        ...(options.agent ? { agent: options.agent } : {}),
      },
      (response) => {
        response.resume()
        response.on('end', () => {
          resolve({ status: response.statusCode ?? 0 })
        })
      },
    )
    req.on('error', reject)
    req.end()
  })
}

describe('LoopbackServer', () => {
  it('binds to loopback and exposes a callback URL on an ephemeral port', async () => {
    server = await LoopbackServer.start('state-1', silentLogger)
    expect(server.redirectUri).toBe(`http://127.0.0.1:${server.port}/callback`)
    expect(server.port).toBeGreaterThan(0)
  })

  it('returns the code when state matches', async () => {
    server = await LoopbackServer.start('state-1', silentLogger)
    const pending = server.waitForCode()

    const response = await call(server.port, '/callback?code=the-code&state=state-1')

    expect(response.status).toBe(200)
    await expect(pending).resolves.toBe('the-code')
  })

  it('rejects a mismatched state rather than exchanging the code', async () => {
    server = await LoopbackServer.start('state-1', silentLogger)
    // Attach the expectation before triggering, so the rejection is never unhandled.
    const rejected = expect(server.waitForCode()).rejects.toThrow(/state_mismatch/)

    const response = await call(server.port, '/callback?code=the-code&state=attacker')

    expect(response.status).toBe(404)
    await rejected
  })

  it('rejects a request whose Host header is not our loopback address', async () => {
    server = await LoopbackServer.start('state-1', silentLogger)
    const pending = server.waitForCode()
    let settled = false
    void pending.catch(() => {
      settled = true
    })

    const response = await call(server.port, '/callback?code=c&state=state-1', {
      host: 'attacker.example',
    })

    expect(response.status).toBe(404)
    expect(settled).toBe(false)
  })

  it('ignores other paths and methods without settling', async () => {
    server = await LoopbackServer.start('state-1', silentLogger)
    const pending = server.waitForCode()
    let settled = false
    void pending.catch(() => {
      settled = true
    })

    expect((await call(server.port, '/')).status).toBe(404)
    expect((await call(server.port, '/callback', { method: 'POST' })).status).toBe(404)
    expect(settled).toBe(false)
  })

  it('always finishes closing, even with a keep-alive connection outstanding', async () => {
    server = await LoopbackServer.start('state-1', silentLogger)
    const pending = server.waitForCode()

    const keepAlive = new Agent({ keepAlive: true })
    await call(server.port, '/callback?code=the-code&state=state-1', { agent: keepAlive })
    await expect(pending).resolves.toBe('the-code')

    // close() is bounded by design, so this asserts the guarantee the sign-in
    // flow depends on: shutting the listener down can never stall the result.
    const closed = server.close().then(() => 'closed' as const)
    const stalled = new Promise<'stalled'>((resolve) =>
      setTimeout(() => {
        resolve('stalled')
      }, 4_000),
    )

    await expect(Promise.race([closed, stalled])).resolves.toBe('closed')
    keepAlive.destroy()
    server = null
  })

  it('reports a denied consent screen', async () => {
    server = await LoopbackServer.start('state-1', silentLogger)
    const rejected = expect(server.waitForCode()).rejects.toThrow(/denied/)

    await call(server.port, '/callback?error=access_denied&state=state-1')

    await rejected
  })
})
