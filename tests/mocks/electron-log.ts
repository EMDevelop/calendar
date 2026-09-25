import type { LogMessage } from 'electron-log'

type Hook = (message: LogMessage) => LogMessage | false

/** Minimal electron-log stand-in; the hook list is what the tests exercise. */
const logger = {
  hooks: [] as Hook[],
  transports: {
    file: { maxSize: 0, level: 'info' as string | false },
    console: { level: 'debug' as string | false },
  },
  initialize(): void {},
  debug(): void {},
  info(): void {},
  warn(): void {},
  error(): void {},
}

export default logger
