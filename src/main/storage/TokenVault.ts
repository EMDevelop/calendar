import { createHash } from 'node:crypto'
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { open } from 'node:fs/promises'
import { join } from 'node:path'
import { safeStorage } from 'electron'
import { SecureStorageUnavailableError } from '../infra/errors.ts'
import type { AppLogger } from '../infra/logger.ts'

/**
 * The only code in the app that touches refresh tokens (docs/spec.md §8.2).
 *
 * Ciphertext comes from Electron's safeStorage, whose key lives in a macOS
 * Keychain item that only our signed app can read. Files are written
 * atomically with mode 0600, and there is no plaintext fallback: if the OS
 * cannot encrypt, we refuse to store anything.
 */

export interface StoredCredential {
  readonly refreshToken: string
  /** Scopes Google actually granted, which can be fewer than we asked for (§8.3). */
  readonly grantedScopes: readonly string[]
  readonly obtainedAt: string
}

const FILE_MODE = 0o600
const DIRECTORY_MODE = 0o700

interface CredentialFileShape {
  readonly refreshToken: unknown
  readonly grantedScopes: unknown
  readonly obtainedAt: unknown
}

export class TokenVault {
  constructor(
    private readonly directory: string,
    private readonly logger: AppLogger,
  ) {}

  /** Creates the token directory with owner-only permissions. */
  async initialise(): Promise<void> {
    await mkdir(this.directory, { recursive: true, mode: DIRECTORY_MODE })
    await chmod(this.directory, DIRECTORY_MODE)
  }

  async has(accountId: string): Promise<boolean> {
    const credential = await this.read(accountId)
    return credential !== null
  }

  async read(accountId: string): Promise<StoredCredential | null> {
    const path = this.pathFor(accountId)

    let ciphertext: Buffer
    try {
      ciphertext = await readFile(path)
    } catch {
      return null
    }

    if (!safeStorage.isEncryptionAvailable()) {
      throw new SecureStorageUnavailableError()
    }

    let plaintext: string
    try {
      plaintext = safeStorage.decryptString(ciphertext)
    } catch {
      // A key we can no longer use is the same as no credential: force re-auth
      // rather than leaving an undecryptable file behind forever.
      this.logger.warn('stored credential could not be decrypted; discarding', {
        account: this.fingerprint(accountId),
      })
      await this.delete(accountId)
      return null
    }

    return this.parse(plaintext, accountId)
  }

  async write(accountId: string, credential: StoredCredential): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new SecureStorageUnavailableError()
    }

    const serialised = JSON.stringify(credential)
    const ciphertext = safeStorage.encryptString(serialised)
    await this.writeAtomically(this.pathFor(accountId), ciphertext)

    this.logger.info('stored credential', { account: this.fingerprint(accountId) })
  }

  async delete(accountId: string): Promise<void> {
    await rm(this.pathFor(accountId), { force: true })
    this.logger.info('deleted credential', { account: this.fingerprint(accountId) })
  }

  /**
   * Account ids are email addresses. Hashing keeps them out of filenames and
   * makes path traversal through a crafted id impossible.
   */
  private pathFor(accountId: string): string {
    return join(this.directory, `${this.fingerprint(accountId)}.bin`)
  }

  private fingerprint(accountId: string): string {
    return createHash('sha256').update(accountId).digest('hex')
  }

  private parse(plaintext: string, accountId: string): StoredCredential | null {
    let candidate: CredentialFileShape
    try {
      candidate = JSON.parse(plaintext) as CredentialFileShape
    } catch {
      this.logger.warn('stored credential was not valid JSON', {
        account: this.fingerprint(accountId),
      })
      return null
    }

    const { refreshToken, grantedScopes, obtainedAt } = candidate
    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      return null
    }

    const scopes = Array.isArray(grantedScopes)
      ? grantedScopes.filter((scope): scope is string => typeof scope === 'string')
      : []

    return {
      refreshToken,
      grantedScopes: scopes,
      obtainedAt: typeof obtainedAt === 'string' ? obtainedAt : new Date().toISOString(),
    }
  }

  /** Write to a temp file, flush it, then rename: a crash can't leave a half-written token. */
  private async writeAtomically(path: string, contents: Buffer): Promise<void> {
    const temporaryPath = `${path}.tmp`
    await writeFile(temporaryPath, contents, { mode: FILE_MODE })

    const handle = await open(temporaryPath, 'r+')
    try {
      await handle.sync()
    } finally {
      await handle.close()
    }

    await rename(temporaryPath, path)
    await chmod(path, FILE_MODE)
  }
}
