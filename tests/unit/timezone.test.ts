import { describe, expect, it } from 'vitest'
import {
  cityOf,
  isValidTimeZone,
  localTimeZone,
  supportedTimeZones,
  timeZoneLabel,
} from '../../src/shared/timezone.ts'

/** A second zone changes labels only; positions stay in epoch time (§6). */

// Summer time in both Spain and the UK.
const SUMMER = new Date('2026-09-25T14:00:00.000Z')
// After the October change, when the offsets differ from summer.
const WINTER = new Date('2026-12-15T14:00:00.000Z')

describe('isValidTimeZone', () => {
  it('accepts real IANA names', () => {
    expect(isValidTimeZone('Europe/London')).toBe(true)
    expect(isValidTimeZone('Europe/Madrid')).toBe(true)
    expect(isValidTimeZone('UTC')).toBe(true)
  })

  it('rejects anything the runtime does not know', () => {
    expect(isValidTimeZone('Mars/Olympus')).toBe(false)
    expect(isValidTimeZone('')).toBe(false)
    expect(isValidTimeZone('not a zone')).toBe(false)
  })
})

describe('timeZoneLabel', () => {
  it('produces a short label per zone', () => {
    const madrid = timeZoneLabel('Europe/Madrid', SUMMER)
    const london = timeZoneLabel('Europe/London', SUMMER)

    expect(madrid.length).toBeGreaterThan(0)
    expect(london.length).toBeGreaterThan(0)
    // Spain and the UK are an hour apart, so the labels must differ.
    expect(madrid).not.toBe(london)
  })

  it('tracks daylight saving rather than being fixed', () => {
    expect(timeZoneLabel('Europe/London', SUMMER)).not.toBe(timeZoneLabel('Europe/London', WINTER))
  })

  it('falls back to the city for an unknown zone', () => {
    expect(timeZoneLabel('Mars/Olympus', SUMMER)).toBe('Olympus')
  })
})

describe('cityOf', () => {
  it('takes the last path segment and tidies underscores', () => {
    expect(cityOf('Europe/Madrid')).toBe('Madrid')
    expect(cityOf('America/New_York')).toBe('New York')
    expect(cityOf('UTC')).toBe('UTC')
  })
})

describe('supportedTimeZones', () => {
  it('offers a usable list including the common European zones', () => {
    const zones = supportedTimeZones()

    expect(zones.length).toBeGreaterThan(0)
    expect(zones).toContain('Europe/London')
    expect(zones).toContain('Europe/Madrid')
  })
})

describe('localTimeZone', () => {
  it('reports a zone the runtime accepts', () => {
    expect(isValidTimeZone(localTimeZone())).toBe(true)
  })
})
