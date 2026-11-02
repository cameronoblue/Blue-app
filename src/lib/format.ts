import { ConvexError } from 'convex/values'
export function message(error: unknown) {
  return error instanceof ConvexError && typeof error.data === 'string' ? error.data : 'Something went wrong. Please try again.'
}
export function dateTime(value: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(value)
}
export function relativeTime(value?: number) {
  if (!value) return 'Not logged yet'
  const minutes = Math.max(0, Math.floor((Date.now() - value) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(value)
}
export const colors = {
  blue: { label: 'Ocean', className: 'event-blue', dot: 'bg-blue-500' },
  violet: { label: 'Iris', className: 'event-violet', dot: 'bg-violet-500' },
  mint: { label: 'Mint', className: 'event-mint', dot: 'bg-emerald-500' },
  amber: { label: 'Amber', className: 'event-amber', dot: 'bg-amber-500' },
  rose: { label: 'Rose', className: 'event-rose', dot: 'bg-rose-500' },
} as const
