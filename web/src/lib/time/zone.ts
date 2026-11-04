import { TZDate, tz } from '@date-fns/tz'
import { differenceInCalendarDays, format } from 'date-fns'
import tzLookup from '@photostructure/tz-lookup'

/**
 * Helpers for working in the *location's* time zone (see ALGORITHM.md →
 * "Time Zones & Day Boundaries"). All results are plain `Date` instants.
 */

export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** IANA zone at coordinates from offline time-zone boundaries, or null. */
export function timeZoneAt(latitude: number, longitude: number): string | null {
  try {
    const zone = tzLookup(latitude, longitude)
    return isValidTimeZone(zone) ? zone : null
  } catch {
    return null
  }
}

export function isValidTimeZone(zone: string | null | undefined): zone is string {
  if (!zone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

/** date-fns `in` context for a zone. */
export function inZone(zone: string) {
  return { in: tz(zone) }
}

function atLocalTime(date: Date, zone: string, hours: number, minutes = 0): Date {
  const local = new TZDate(date.getTime(), zone)
  local.setHours(hours, minutes, 0, 0)
  return new Date(local.getTime())
}

/** Instant of 00:00 local time on the local calendar day containing `date`. */
export function localMidnight(date: Date, zone: string): Date {
  return atLocalTime(date, zone, 0)
}

/** Instant of 12:00 local time on the local calendar day containing `date`. */
export function localNoon(date: Date, zone: string): Date {
  return atLocalTime(date, zone, 12)
}

/** Instant of `hours:minutes` local time on the local calendar day containing `date`. */
export function localTimeOnDay(date: Date, zone: string, hours: number, minutes = 0): Date {
  return atLocalTime(date, zone, hours, minutes)
}

/** Same local wall-clock time, `days` calendar days later (DST-safe). */
export function addLocalDays(date: Date, days: number, zone: string): Date {
  const local = new TZDate(date.getTime(), zone)
  local.setDate(local.getDate() + days)
  return new Date(local.getTime())
}

export function localHour(date: Date, zone: string): number {
  return new TZDate(date.getTime(), zone).getHours()
}

export function localMonthKey(date: Date, zone: string): string {
  return format(date, 'yyyy-MM', inZone(zone))
}

export function localDayKey(date: Date, zone: string): string {
  return format(date, 'yyyy-MM-dd', inZone(zone))
}

/** Calendar-day difference `a − b` in the zone (not 24-hour periods). */
export function localDayDifference(a: Date, b: Date, zone: string): number {
  return differenceInCalendarDays(a, b, inZone(zone))
}

/** Local Y/M/D of an instant, as a device-local midnight Date (for date pickers). */
export function toDeviceCalendarDay(date: Date, zone: string): Date {
  const local = new TZDate(date.getTime(), zone)
  return new Date(local.getFullYear(), local.getMonth(), local.getDate())
}

export function formatRelativeDays(date: Date, now: Date, zone: string): string {
  const days = localDayDifference(date, now, zone)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days < 0) return `${-days}d ago`
  return `in ${days}d`
}
