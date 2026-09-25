import type { AccountColour } from '../../../shared/types/account.ts'

/**
 * Static class strings per colour, because Tailwind cannot see a class name
 * that is assembled at runtime.
 */

export const COLOUR_BAR: Record<AccountColour, string> = {
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
}

export const COLOUR_HEADER: Record<AccountColour, string> = {
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

export const COLOUR_DOT: Record<AccountColour, string> = {
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
}
