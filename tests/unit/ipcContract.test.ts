import { describe, expect, it } from 'vitest'
import { CHANNELS, CHANNEL_CALLERS, PUSH_CHANNELS } from '../../src/shared/ipc/channels.ts'
import {
  REQUEST_SCHEMAS,
  joinEventSchema,
  moveToDisplaySchema,
  setSelectedCalendarsSchema,
  updateSettingsSchema,
} from '../../src/shared/ipc/contract.ts'

/** Types vanish at runtime, so the boundary needs real checks (docs/spec.md §8.5). */
describe('IPC contract', () => {
  it('covers every channel the renderer can invoke', () => {
    const invokable = Object.values(CHANNELS).filter((channel) => !PUSH_CHANNELS.includes(channel))

    for (const channel of invokable) {
      expect(REQUEST_SCHEMAS).toHaveProperty(channel)
    }
  })

  it('gives push channels no request schema, since nothing is sent inbound', () => {
    for (const channel of PUSH_CHANNELS) {
      expect(REQUEST_SCHEMAS).not.toHaveProperty(channel)
    }
  })

  it('declares which window may use each channel', () => {
    for (const channel of Object.values(CHANNELS)) {
      expect(CHANNEL_CALLERS[channel].length).toBeGreaterThan(0)
    }
  })

  it('rejects unexpected properties', () => {
    expect(joinEventSchema.safeParse({ eventId: 'a', extra: 1 }).success).toBe(false)
    expect(
      setSelectedCalendarsSchema.safeParse({ accountId: 'a', calendarIds: [], evil: true }).success,
    ).toBe(false)
  })

  it('rejects wrong types and empty identifiers', () => {
    expect(joinEventSchema.safeParse({ eventId: '' }).success).toBe(false)
    expect(joinEventSchema.safeParse({ eventId: 42 }).success).toBe(false)
    expect(joinEventSchema.safeParse({}).success).toBe(false)
    expect(joinEventSchema.safeParse(null).success).toBe(false)
  })

  it('bounds string length so a hostile renderer cannot send unbounded payloads', () => {
    expect(joinEventSchema.safeParse({ eventId: 'x'.repeat(513) }).success).toBe(false)
  })

  it('bounds the number of calendars', () => {
    const calendarIds = Array.from({ length: 101 }, (_unused, index) => `cal-${index}`)
    expect(setSelectedCalendarsSchema.safeParse({ accountId: 'a', calendarIds }).success).toBe(
      false,
    )
  })

  it('keeps settings within their documented ranges', () => {
    expect(updateSettingsSchema.safeParse({ syncIntervalMinutes: 3 }).success).toBe(true)
    expect(updateSettingsSchema.safeParse({ syncIntervalMinutes: 0 }).success).toBe(false)
    expect(updateSettingsSchema.safeParse({ syncIntervalMinutes: 60 }).success).toBe(false)
    expect(updateSettingsSchema.safeParse({ notificationLeadMinutes: null }).success).toBe(true)
    expect(updateSettingsSchema.safeParse({ notificationLeadMinutes: 99 }).success).toBe(false)
    expect(updateSettingsSchema.safeParse({ theme: 'neon' }).success).toBe(false)
  })

  it('rejects an empty settings patch', () => {
    expect(updateSettingsSchema.safeParse({}).success).toBe(false)
  })

  it('validates display moves', () => {
    const display = { id: 1, label: 'Built-in', width: 1512, height: 982 }
    expect(moveToDisplaySchema.safeParse({ display, corner: 'topRight' }).success).toBe(true)
    expect(moveToDisplaySchema.safeParse({ display, corner: 'middle' }).success).toBe(false)
    expect(
      moveToDisplaySchema.safeParse({ display: { ...display, width: -1 }, corner: 'topRight' })
        .success,
    ).toBe(false)
  })
})
