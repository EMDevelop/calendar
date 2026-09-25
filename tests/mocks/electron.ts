/**
 * Stand-in for Electron so main-process modules can be unit tested in plain
 * Node. Only the surfaces the tests touch are implemented.
 */

export const safeStorageState = {
  available: true,
  failDecrypt: false,
}

const CIPHER_PREFIX = 'enc:'

export const safeStorage = {
  isEncryptionAvailable(): boolean {
    return safeStorageState.available
  },
  // Not real encryption, but it must not leave the plaintext readable, or
  // tests asserting "nothing is written in the clear" would pass for free.
  encryptString(plaintext: string): Buffer {
    const encoded = Buffer.from(plaintext, 'utf8').toString('base64')
    return Buffer.from(`${CIPHER_PREFIX}${encoded}`, 'utf8')
  },
  decryptString(ciphertext: Buffer): string {
    if (safeStorageState.failDecrypt) {
      throw new Error('cannot decrypt')
    }
    const text = ciphertext.toString('utf8')
    if (!text.startsWith(CIPHER_PREFIX)) {
      throw new Error('not our ciphertext')
    }
    return Buffer.from(text.slice(CIPHER_PREFIX.length), 'base64').toString('utf8')
  },
}

export const openedExternalUrls: string[] = []

export const shell = {
  openExternal(url: string): Promise<void> {
    openedExternalUrls.push(url)
    return Promise.resolve()
  },
}

export const protocol = {
  registerSchemesAsPrivileged(): void {},
  handle(): void {},
}

export const app = {
  isPackaged: false,
  getPath(): string {
    return '/tmp'
  },
  getAppPath(): string {
    return '/tmp'
  },
}

export function resetElectronMock(): void {
  safeStorageState.available = true
  safeStorageState.failDecrypt = false
  openedExternalUrls.length = 0
}
