import SunCalc from 'suncalc'
import type { ProximityEvent } from '@/types'
import { addLocalDays, localMidnight, localNoon } from '@/lib/time/zone'
import { getMoonRiseSet } from './moon-calculator'

/** Maximum time difference in minutes for a proximity event. */
const MAX_TIME_DIFF_MINUTES = 30

/** Maximum deviation (degrees) from the ideal alignment. */
const MAX_AZIMUTH_DIFF_DEGREES = 30

/** The moon must be at least this lit (%) to be visible/photogenic. */
const MIN_MOON_ILLUMINATION_PERCENT = 5

type EventType = ProximityEvent['type']

interface TimePair {
  moonTime: Date
  sunTime: Date
  type: EventType
}

/**
 * Cross pairs (moonrise + sunset, moonset + sunrise) put the moon opposite the Sun —
 * the classic full-moon shot. Same-event pairs put the moon next to the Sun.
 */
export function isOppositionPair(type: EventType): boolean {
  return type === 'moonrise-sunset' || type === 'moonset-sunrise'
}

/**
 * Get a compass direction string from an azimuth angle (degrees from north).
 */
function getCompassDirection(azimuth: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const normalized = ((azimuth % 360) + 360) % 360
  const index = Math.round(normalized / 22.5) % 16
  return directions[index]
}

/**
 * Absolute angular difference between two azimuths, accounting for wrap-around.
 */
function azimuthDifference(az1: number, az2: number): number {
  let diff = Math.abs(az1 - az2) % 360
  if (diff > 180) diff = 360 - diff
  return diff
}

function toAzimuthDegrees(azimuthRadians: number): number {
  return ((azimuthRadians * (180 / Math.PI)) + 180) % 360
}

/**
 * Find moonrise/moonset events that happen within 30 minutes of sunrise/sunset with the
 * moon either beside the Sun (same-event pairs) or opposite it (cross pairs).
 * See ALGORITHM.md → "Proximity Finder".
 */
export function findProximityEvents(
  startDate: Date,
  days: number,
  lat: number,
  lon: number,
  timeZone: string,
): ProximityEvent[] {
  const events: ProximityEvent[] = []

  for (let i = 0; i < days; i++) {
    const dayStart = localMidnight(addLocalDays(startDate, i, timeZone), timeZone)

    const sunTimes = SunCalc.getTimes(localNoon(dayStart, timeZone), lat, lon)
    const moonTimes = getMoonRiseSet(dayStart, lat, lon)

    const sunrise = Number.isNaN(sunTimes.sunrise.getTime()) ? null : sunTimes.sunrise
    const sunset = Number.isNaN(sunTimes.sunset.getTime()) ? null : sunTimes.sunset
    const { rise: moonrise, set: moonset } = moonTimes

    const pairs: TimePair[] = []
    if (moonrise && sunrise) pairs.push({ moonTime: moonrise, sunTime: sunrise, type: 'moonrise-sunrise' })
    if (moonrise && sunset) pairs.push({ moonTime: moonrise, sunTime: sunset, type: 'moonrise-sunset' })
    if (moonset && sunrise) pairs.push({ moonTime: moonset, sunTime: sunrise, type: 'moonset-sunrise' })
    if (moonset && sunset) pairs.push({ moonTime: moonset, sunTime: sunset, type: 'moonset-sunset' })

    for (const pair of pairs) {
      const timeDiffMinutes = Math.abs(pair.moonTime.getTime() - pair.sunTime.getTime()) / 60_000
      if (timeDiffMinutes > MAX_TIME_DIFF_MINUTES) continue

      const midpoint = new Date((pair.moonTime.getTime() + pair.sunTime.getTime()) / 2)
      const moonAzimuth = toAzimuthDegrees(SunCalc.getMoonPosition(midpoint, lat, lon).azimuth)
      const sunAzimuth = toAzimuthDegrees(SunCalc.getPosition(midpoint, lat, lon).azimuth)

      const opposite = isOppositionPair(pair.type)
      const idealAzimuth = opposite ? sunAzimuth + 180 : sunAzimuth
      const azDiff = azimuthDifference(moonAzimuth, idealAzimuth)
      if (azDiff > MAX_AZIMUTH_DIFF_DEGREES) continue

      const illuminationPercent = Math.round(SunCalc.getMoonIllumination(midpoint).fraction * 100)
      if (illuminationPercent < MIN_MOON_ILLUMINATION_PERCENT) continue

      const moonDirection = getCompassDirection(moonAzimuth)
      const description = opposite
        ? `Moon ${illuminationPercent}% lit at ${moonDirection}, opposite the Sun (${Math.round(azDiff)}° off)`
        : `Moon ${illuminationPercent}% lit at ${moonDirection}, ${Math.round(azDiff)}° from the Sun`

      events.push({
        date: dayStart,
        type: pair.type,
        timeDiffMinutes: Math.round(timeDiffMinutes * 10) / 10,
        azimuthDiff: Math.round(azDiff * 10) / 10,
        moonIllumination: illuminationPercent,
        description,
        moonTime: pair.moonTime,
        sunTime: pair.sunTime,
      })
    }
  }

  events.sort((a, b) => a.sunTime.getTime() - b.sunTime.getTime())
  return events
}
