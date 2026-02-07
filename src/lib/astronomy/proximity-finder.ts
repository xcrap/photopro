import SunCalc from 'suncalc'
import { addDays } from 'date-fns'
import type { ProximityEvent } from '@/types'

/** Maximum time difference in minutes for a proximity event. */
const MAX_TIME_DIFF_MINUTES = 30

/** Maximum azimuth difference in degrees for a photo opportunity. */
const MAX_AZIMUTH_DIFF_DEGREES = 30

type EventType = ProximityEvent['type']

interface TimePair {
  moonTime: Date
  sunTime: Date
  type: EventType
}

/**
 * Get a compass direction string from an azimuth angle (degrees from north).
 */
function getCompassDirection(azimuth: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(azimuth / 22.5) % 16
  return directions[index]
}

/**
 * Calculate the absolute angular difference between two azimuths,
 * accounting for the circular nature of angles (0-360).
 */
function azimuthDifference(az1: number, az2: number): number {
  let diff = Math.abs(az1 - az2)
  if (diff > 180) diff = 360 - diff
  return diff
}

/**
 * Find proximity events where the moon and sun rise or set near each other.
 * These are prime photo opportunities for capturing both celestial bodies together.
 */
export function findProximityEvents(
  startDate: Date,
  days: number,
  lat: number,
  lon: number,
): ProximityEvent[] {
  const events: ProximityEvent[] = []

  for (let i = 0; i < days; i++) {
    const currentDate = addDays(startDate, i)

    // Get sun and moon times for this day
    const sunTimes = SunCalc.getTimes(currentDate, lat, lon)
    const moonTimes = SunCalc.getMoonTimes(currentDate, lat, lon)

    const moonrise = moonTimes.rise
    const moonset = moonTimes.set
    const sunrise = sunTimes.sunrise
    const sunset = sunTimes.sunset

    // Build all 4 possible time pairs
    const pairs: TimePair[] = []

    if (moonrise && sunrise) {
      pairs.push({ moonTime: moonrise, sunTime: sunrise, type: 'moonrise-sunrise' })
    }
    if (moonrise && sunset) {
      pairs.push({ moonTime: moonrise, sunTime: sunset, type: 'moonrise-sunset' })
    }
    if (moonset && sunrise) {
      pairs.push({ moonTime: moonset, sunTime: sunrise, type: 'moonset-sunrise' })
    }
    if (moonset && sunset) {
      pairs.push({ moonTime: moonset, sunTime: sunset, type: 'moonset-sunset' })
    }

    for (const pair of pairs) {
      const timeDiffMs = Math.abs(pair.moonTime.getTime() - pair.sunTime.getTime())
      const timeDiffMinutes = timeDiffMs / (1000 * 60)

      if (timeDiffMinutes > MAX_TIME_DIFF_MINUTES) continue

      // Calculate midpoint time for position checks
      const midpointMs = (pair.moonTime.getTime() + pair.sunTime.getTime()) / 2
      const midpointDate = new Date(midpointMs)

      // Get azimuths at the midpoint time
      const moonPos = SunCalc.getMoonPosition(midpointDate, lat, lon)
      const sunPos = SunCalc.getPosition(midpointDate, lat, lon)

      // Convert azimuths from radians (from south) to degrees (from north)
      const moonAzimuth = ((moonPos.azimuth * (180 / Math.PI)) + 180) % 360
      const sunAzimuth = ((sunPos.azimuth * (180 / Math.PI)) + 180) % 360

      const azDiff = azimuthDifference(moonAzimuth, sunAzimuth)

      if (azDiff > MAX_AZIMUTH_DIFF_DEGREES) continue

      // Get moon illumination at this time
      const moonIllumination = SunCalc.getMoonIllumination(midpointDate)
      const illuminationPercent = Math.round(moonIllumination.fraction * 100)

      // Determine average direction for the description
      const avgAzimuth = (moonAzimuth + sunAzimuth) / 2
      const direction = getCompassDirection(avgAzimuth)

      const description =
        `Moon ${Math.round(azDiff)}\u00B0 from Sun at ${direction}, ${illuminationPercent}% illuminated`

      events.push({
        date: currentDate,
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

  // Sort by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime())

  return events
}
