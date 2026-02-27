import { format as fnsFormat } from 'date-fns'

export function formatTime(date: Date, timeFormat: '12h' | '24h'): string {
  if (timeFormat === '12h') {
    return fnsFormat(date, 'h:mm a')
  }
  return fnsFormat(date, 'H:mm')
}

export function formatDate(date: Date): string {
  return fnsFormat(date, 'MMM d, yyyy')
}

export function formatDateShort(date: Date): string {
  return fnsFormat(date, 'MMM d')
}

export function formatDegrees(degrees: number): string {
  return `${degrees.toFixed(1)}\u00B0`
}

export function formatDistance(km: number): string {
  return `${km.toLocaleString('en-US')} km`
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
