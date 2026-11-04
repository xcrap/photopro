import { format as fnsFormat } from 'date-fns'
import { inZone } from '@/lib/time/zone'

const MISSING = '—'

/** Format a time in the location's time zone. `null` (absent event) renders as "—". */
export function formatTime(date: Date | null, timeFormat: '12h' | '24h', timeZone: string): string {
  if (!date || Number.isNaN(date.getTime())) return MISSING
  return fnsFormat(date, timeFormat === '12h' ? 'h:mm a' : 'H:mm', inZone(timeZone))
}

/** "start – end", or "—" when either end is absent. */
export function formatTimeRange(
  start: Date | null,
  end: Date | null,
  timeFormat: '12h' | '24h',
  timeZone: string,
): string {
  if (!start || !end) return MISSING
  return `${formatTime(start, timeFormat, timeZone)} – ${formatTime(end, timeFormat, timeZone)}`
}

export function formatDate(date: Date, timeZone: string): string {
  return fnsFormat(date, 'MMM d, yyyy', inZone(timeZone))
}

export function formatDateShort(date: Date, timeZone: string): string {
  return fnsFormat(date, 'MMM d', inZone(timeZone))
}

/** Short zone label for an instant, e.g. "GMT-5" or "CET". */
export function formatTimeZoneLabel(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(date)
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone
  } catch {
    return timeZone
  }
}

export function formatDegrees(degrees: number): string {
  return `${degrees.toFixed(1)}°`
}

export function formatDistance(km: number): string {
  return `${Math.round(km).toLocaleString('en-US')} km`
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)

  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

export function formatAzimuthDirection(azimuth: number): string {
  // Normalize to 0-360
  const normalized = ((azimuth % 360) + 360) % 360
  const index = Math.round(normalized / 45) % 8
  return DIRECTIONS[index]
}
