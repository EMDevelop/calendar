/**
 * Typed errors say what to do, not what went wrong inside a vendor SDK
 * (docs/spec.md §3). Vendor errors are mapped at the provider boundary so raw
 * HTTP errors — which carry Authorization headers — never travel (§8.7).
 */

export abstract class AppError extends Error {
  protected constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

/** The refresh token is dead or a required scope is missing. Stop syncing. */
export class ReauthRequiredError extends AppError {
  constructor(
    readonly accountId: string,
    readonly reason: 'invalid_grant' | 'missing_scope' | 'revoked',
  ) {
    super(`account ${accountId} needs re-authentication (${reason})`)
  }
}

/** Network failure, timeout, 429 or 5xx. Keep last-known events and retry. */
export class TransientProviderError extends AppError {
  constructor(
    readonly accountId: string,
    readonly statusCode: number | null,
    detail: string,
  ) {
    super(`temporary provider failure for ${accountId}: ${detail}`)
  }
}

/** The sign-in flow could not be completed. */
export class AuthFlowError extends AppError {
  constructor(
    readonly reason:
      'state_mismatch' | 'timeout' | 'denied' | 'bad_host' | 'exchange_failed' | 'no_refresh_token',
    detail?: string,
  ) {
    super(detail ? `sign-in failed (${reason}): ${detail}` : `sign-in failed (${reason})`)
  }
}

/** OS-level encryption is unavailable, so no token may be written (§8.2). */
export class SecureStorageUnavailableError extends AppError {
  constructor() {
    super('macOS secure storage is unavailable; refusing to store credentials')
  }
}

export class IpcValidationError extends AppError {
  constructor(
    readonly channel: string,
    detail: string,
  ) {
    super(`rejected IPC message on ${channel}: ${detail}`)
  }
}

export function isReauthRequired(error: unknown): error is ReauthRequiredError {
  return error instanceof ReauthRequiredError
}

export function isTransient(error: unknown): error is TransientProviderError {
  return error instanceof TransientProviderError
}

/** Message without vendor payloads, safe to log. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }
  return 'unknown error'
}
