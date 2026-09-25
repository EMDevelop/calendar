import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TokenVault } from '../../src/main/storage/TokenVault.ts'
import { SecureStorageUnavailableError } from '../../src/main/infra/errors.ts'
import type { AppLogger } from '../../src/main/infra/logger.ts'
import { resetElectronMock, safeStorageState } from '../mocks/electron.ts'

/** Token handling outranks everything else in the spec (§8.2). */

const silentLogger: AppLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger,
}

const ACCOUNT = 'someone@example.com'
const CREDENTIAL = {
  refreshToken: 'refresh-token-value',
  grantedScopes: ['https://www.googleapis.com/auth/calendar.events.readonly'],
  obtainedAt: '2026-09-25T10:00:00.000Z',
}

let directory = ''
let vault: TokenVault

beforeEach(async () => {
  resetElectronMock()
  directory = await mkdtemp(join(tmpdir(), 'vault-test-'))
  vault = new TokenVault(directory, silentLogger)
  await vault.initialise()
})

afterEach(() => {
  resetElectronMock()
})

describe('TokenVault', () => {
  it('round-trips a credential', async () => {
    await vault.write(ACCOUNT, CREDENTIAL)
    const loaded = await vault.read(ACCOUNT)

    expect(loaded).toEqual(CREDENTIAL)
  })

  it('returns null when nothing is stored', async () => {
    await expect(vault.read('nobody@example.com')).resolves.toBeNull()
    await expect(vault.has('nobody@example.com')).resolves.toBe(false)
  })

  it('refuses to store anything when the OS cannot encrypt', async () => {
    safeStorageState.available = false

    await expect(vault.write(ACCOUNT, CREDENTIAL)).rejects.toBeInstanceOf(
      SecureStorageUnavailableError,
    )
  })

  it('never writes the refresh token in the clear', async () => {
    await vault.write(ACCOUNT, CREDENTIAL)

    const files = await readStoredFiles(directory)
    expect(files).toHaveLength(1)
    expect(files[0]!.contents).not.toContain(CREDENTIAL.refreshToken)
  })

  it('writes with owner-only permissions', async () => {
    await vault.write(ACCOUNT, CREDENTIAL)

    const files = await readStoredFiles(directory)
    const mode = (await stat(files[0]!.path)).mode & 0o777
    expect(mode).toBe(0o600)
  })

  it('keeps the account address out of the filename', async () => {
    await vault.write(ACCOUNT, CREDENTIAL)

    const files = await readStoredFiles(directory)
    expect(files[0]!.path).not.toContain('someone')
    expect(files[0]!.path).not.toContain('@')
  })

  it('leaves no temporary file behind', async () => {
    await vault.write(ACCOUNT, CREDENTIAL)

    const { readdir } = await import('node:fs/promises')
    const entries = await readdir(directory)
    expect(entries.some((entry) => entry.endsWith('.tmp'))).toBe(false)
  })

  it('discards a credential it can no longer decrypt', async () => {
    await vault.write(ACCOUNT, CREDENTIAL)
    safeStorageState.failDecrypt = true

    await expect(vault.read(ACCOUNT)).resolves.toBeNull()

    safeStorageState.failDecrypt = false
    await expect(vault.read(ACCOUNT)).resolves.toBeNull()
  })

  it('treats an unreadable payload as no credential', async () => {
    await vault.write(ACCOUNT, CREDENTIAL)
    const files = await readStoredFiles(directory)
    await writeFile(files[0]!.path, Buffer.from('enc:not json', 'utf8'))

    await expect(vault.read(ACCOUNT)).resolves.toBeNull()
  })

  it('deletes a credential', async () => {
    await vault.write(ACCOUNT, CREDENTIAL)
    await vault.delete(ACCOUNT)

    await expect(vault.read(ACCOUNT)).resolves.toBeNull()
  })

  it('keeps accounts isolated from one another', async () => {
    await vault.write(ACCOUNT, CREDENTIAL)
    await vault.write('other@example.com', { ...CREDENTIAL, refreshToken: 'other-token' })

    await vault.delete(ACCOUNT)

    await expect(vault.read(ACCOUNT)).resolves.toBeNull()
    await expect(vault.read('other@example.com')).resolves.not.toBeNull()
  })
})

async function readStoredFiles(dir: string): Promise<{ path: string; contents: string }[]> {
  const { readdir } = await import('node:fs/promises')
  const entries = await readdir(dir)
  const files = entries.filter((entry) => entry.endsWith('.bin'))
  return await Promise.all(
    files.map(async (entry) => {
      const path = join(dir, entry)
      const contents = await readFile(path, 'utf8')
      return { path, contents }
    }),
  )
}
