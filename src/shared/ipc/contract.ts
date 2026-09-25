import { z } from 'zod'
import {
  ACCOUNT_COLOURS,
  MAX_EVENT_TITLE_LENGTH,
  MAX_NOTIFICATION_LEAD_MINUTES,
  MAX_SYNC_INTERVAL_MINUTES,
  MIN_SYNC_INTERVAL_MINUTES,
} from '../constants.ts'
import { CHANNELS } from './channels.ts'

/**
 * One schema per channel. Types vanish at runtime, so main validates every
 * inbound payload against these, and the renderer validates what it receives
 * back (docs/spec.md §8.5).
 */

const identifier = z.string().min(1).max(512)
const label = z.string().min(1).max(120)
const isoTimestamp = z.string().min(1).max(40)
const colour = z.enum(ACCOUNT_COLOURS)
const noPayload = z.undefined()

export const accountIdPayloadSchema = z.strictObject({ accountId: identifier })
export const connectAccountSchema = z.strictObject({ provider: z.literal('google') })

export const updateAccountSchema = z.strictObject({
  accountId: identifier,
  label: label.optional(),
  colour: colour.optional(),
})

export const setSelectedCalendarsSchema = z.strictObject({
  accountId: identifier,
  calendarIds: z.array(identifier).max(100),
})

export const displayKeySchema = z.strictObject({
  id: z.number().int(),
  label: z.string().max(200),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

export const moveToDisplaySchema = z.strictObject({
  display: displayKeySchema,
  corner: z.enum(['topRight', 'topLeft', 'bottomRight', 'bottomLeft', 'remembered']),
})

export const updateSettingsSchema = z
  .strictObject({
    viewMode: z.enum(['merged', 'split']),
    theme: z.enum(['system', 'light', 'dark']),
    syncIntervalMinutes: z
      .number()
      .int()
      .min(MIN_SYNC_INTERVAL_MINUTES)
      .max(MAX_SYNC_INTERVAL_MINUTES),
    notificationLeadMinutes: z.number().int().min(0).max(MAX_NOTIFICATION_LEAD_MINUTES).nullable(),
    dayStartHour: z.number().int().min(0).max(23),
    dayEndHour: z.number().int().min(1).max(24),
    hideTitlesInMenuBar: z.boolean(),
    privacyMode: z.boolean(),
    launchAtLogin: z.boolean(),
    alwaysOnTop: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'no settings supplied' })

export const setPinnedSchema = z.strictObject({ pinned: z.boolean() })
export const joinEventSchema = z.strictObject({ eventId: identifier })

export const REQUEST_SCHEMAS = {
  [CHANNELS.agendaJoin]: joinEventSchema,
  [CHANNELS.widgetHide]: noPayload,
  [CHANNELS.widgetSetPinned]: setPinnedSchema,
  [CHANNELS.settingsOpen]: noPayload,
  [CHANNELS.accountsList]: noPayload,
  [CHANNELS.accountsConnect]: connectAccountSchema,
  [CHANNELS.accountsReconnect]: accountIdPayloadSchema,
  [CHANNELS.accountsDisconnect]: accountIdPayloadSchema,
  [CHANNELS.accountsUpdate]: updateAccountSchema,
  [CHANNELS.calendarsList]: accountIdPayloadSchema,
  [CHANNELS.calendarsSetSelected]: setSelectedCalendarsSchema,
  [CHANNELS.displaysList]: noPayload,
  [CHANNELS.widgetMoveToDisplay]: moveToDisplaySchema,
  [CHANNELS.settingsGet]: noPayload,
  [CHANNELS.settingsUpdate]: updateSettingsSchema,
  [CHANNELS.syncNow]: noPayload,
} as const

/* Outbound shapes. The renderer validates these too, so a bug in main can't
 * quietly feed the UI something unexpected. */

export const agendaItemSchema = z.strictObject({
  id: identifier,
  accountId: identifier,
  colour,
  title: z.string().max(MAX_EVENT_TITLE_LENGTH),
  start: isoTimestamp,
  end: isoTimestamp,
  isAllDay: z.boolean(),
  status: z.enum(['past', 'live', 'imminent', 'upcoming']),
  startsInMinutes: z.number().int(),
  minutesRemaining: z.number().int(),
  canJoin: z.boolean(),
})

export const agendaAccountSchema = z.strictObject({
  id: identifier,
  label,
  colour,
  status: z.enum(['ready', 'syncing', 'offline', 'needsReauth']),
  lastSyncedAt: isoTimestamp.nullable(),
})

export const agendaSnapshotSchema = z.strictObject({
  now: isoTimestamp,
  window: z.strictObject({ start: isoTimestamp, end: isoTimestamp }),
  timed: z.array(agendaItemSchema),
  allDay: z.array(agendaItemSchema),
  accounts: z.array(agendaAccountSchema),
  nextUp: agendaItemSchema.nullable(),
  viewMode: z.enum(['merged', 'split']),
  privacyMode: z.boolean(),
})

export const accountViewSchema = z.strictObject({
  id: identifier,
  provider: z.enum(['google', 'mock']),
  label,
  colour,
  status: z.enum(['ready', 'syncing', 'offline', 'needsReauth']),
  calendarIds: z.array(identifier),
  lastSyncedAt: isoTimestamp.nullable(),
  canListCalendars: z.boolean(),
})

export const calendarSummarySchema = z.strictObject({
  id: identifier,
  title: z.string().max(MAX_EVENT_TITLE_LENGTH),
  primary: z.boolean(),
})

export const displayOptionSchema = z.strictObject({
  key: displayKeySchema,
  isPrimary: z.boolean(),
  isCurrent: z.boolean(),
})

export const widgetPlacementSchema = z.strictObject({
  display: displayKeySchema.nullable(),
  corner: z.enum(['topRight', 'topLeft', 'bottomRight', 'bottomLeft', 'remembered']),
  bounds: z
    .strictObject({
      x: z.number().int(),
      y: z.number().int(),
      width: z.number().int(),
      height: z.number().int(),
    })
    .nullable(),
})

export const accountConfigSchema = z.strictObject({
  id: identifier,
  provider: z.enum(['google', 'mock']),
  label,
  colour,
  calendarIds: z.array(identifier),
})

export const appSettingsSchema = z.strictObject({
  viewMode: z.enum(['merged', 'split']),
  theme: z.enum(['system', 'light', 'dark']),
  syncIntervalMinutes: z
    .number()
    .int()
    .min(MIN_SYNC_INTERVAL_MINUTES)
    .max(MAX_SYNC_INTERVAL_MINUTES),
  notificationLeadMinutes: z.number().int().min(0).max(MAX_NOTIFICATION_LEAD_MINUTES).nullable(),
  dayStartHour: z.number().int().min(0).max(23),
  dayEndHour: z.number().int().min(1).max(24),
  hideTitlesInMenuBar: z.boolean(),
  privacyMode: z.boolean(),
  launchAtLogin: z.boolean(),
  alwaysOnTop: z.boolean(),
  placement: widgetPlacementSchema,
  accounts: z.array(accountConfigSchema),
})

export const accountListSchema = z.array(accountViewSchema)
export const calendarListSchema = z.array(calendarSummarySchema)
export const displayListSchema = z.array(displayOptionSchema)

export type ConnectAccountRequest = z.infer<typeof connectAccountSchema>
export type AccountIdRequest = z.infer<typeof accountIdPayloadSchema>
export type UpdateAccountRequest = z.infer<typeof updateAccountSchema>
export type SetSelectedCalendarsRequest = z.infer<typeof setSelectedCalendarsSchema>
export type MoveToDisplayRequest = z.infer<typeof moveToDisplaySchema>
export type UpdateSettingsRequest = z.infer<typeof updateSettingsSchema>
export type SetPinnedRequest = z.infer<typeof setPinnedSchema>
export type JoinEventRequest = z.infer<typeof joinEventSchema>
