import { ipcMain } from 'electron'
import type { z } from 'zod'
import {
  CHANNEL_CALLERS,
  RATE_LIMITED_CHANNELS,
  RATE_LIMIT_WINDOW_MS,
  type ChannelName,
  type WindowRole,
} from '../../shared/ipc/channels.ts'
import { REQUEST_SCHEMAS } from '../../shared/ipc/contract.ts'
import { describeError } from '../infra/errors.ts'
import type { AppLogger } from '../infra/logger.ts'
import { roleForSenderUrl } from './senderRole.ts'

/**
 * Every inbound message passes three gates before a handler sees it
 * (docs/spec.md §8.5):
 *
 * 1. the sender is one of our windows, and is allowed on this channel
 * 2. the payload matches the channel's strict schema
 * 3. side-effecting channels are not being hammered
 *
 * Rejected messages are logged without their payload and never reach a handler.
 */

type RequestSchemas = typeof REQUEST_SCHEMAS
export type RequestChannel = keyof RequestSchemas & ChannelName
export type PayloadOf<C extends RequestChannel> = z.infer<RequestSchemas[C]>

/** Deliberately vague: a renderer learns nothing about why it was refused. */
const REJECTION_MESSAGE = 'request rejected'

export class IpcRouter {
  private readonly lastCallAt = new Map<string, number>()

  constructor(
    private readonly devServerOrigin: string | null,
    private readonly logger: AppLogger,
    private readonly now: () => number = () => Date.now(),
  ) {}

  handle<C extends RequestChannel>(
    channel: C,
    handler: (payload: PayloadOf<C>, role: WindowRole) => unknown,
  ): void {
    ipcMain.handle(channel, async (event, rawPayload: unknown) => {
      const role = roleForSenderUrl(event.senderFrame?.url, this.devServerOrigin)
      if (!role) {
        this.logger.warn('dropped IPC message from an unrecognised sender', { channel })
        throw new Error(REJECTION_MESSAGE)
      }
      if (!CHANNEL_CALLERS[channel].includes(role)) {
        this.logger.warn('dropped IPC message from a window not allowed on this channel', {
          channel,
          role,
        })
        throw new Error(REJECTION_MESSAGE)
      }

      const parsed = REQUEST_SCHEMAS[channel].safeParse(rawPayload)
      if (!parsed.success) {
        // The payload itself is never logged.
        this.logger.warn('dropped IPC message that failed validation', { channel, role })
        throw new Error(REJECTION_MESSAGE)
      }

      if (this.isRateLimited(channel, role)) {
        this.logger.warn('dropped repeated IPC message', { channel, role })
        throw new Error(REJECTION_MESSAGE)
      }

      try {
        return await handler(parsed.data as PayloadOf<C>, role)
      } catch (error) {
        // The detail is logged here and deliberately not attached as a `cause`:
        // Electron serialises a rejected handler error back to the renderer,
        // and the renderer is untrusted (§8.4).
        this.logger.error('IPC handler failed', { channel, error: describeError(error) })
        // eslint-disable-next-line preserve-caught-error -- see above
        throw new Error(REJECTION_MESSAGE)
      }
    })
  }

  private isRateLimited(channel: ChannelName, role: WindowRole): boolean {
    if (!RATE_LIMITED_CHANNELS.includes(channel)) {
      return false
    }

    const key = `${channel}:${role}`
    const now = this.now()
    const previous = this.lastCallAt.get(key)
    if (previous !== undefined && now - previous < RATE_LIMIT_WINDOW_MS) {
      return true
    }

    this.lastCallAt.set(key, now)
    return false
  }
}
