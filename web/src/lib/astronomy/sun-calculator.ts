import SunCalc from 'suncalc'
import type { SunTimes, SunPosition, PolarCondition } from '@/types'
import { localNoon } from '@/lib/time/zone'

function validOrNull(date: Date | undefined): Date | null {
  if (!date) return null
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Get comprehensive sun times for the local calendar day (in `timeZone`) containing `date`.
 * SunCalc returns the solar day nearest the given instant, so it is always called with
 * 12:00 local time. Events the Sun never reaches that day (polar day/night) are `null`.
 */
export function getSunTimes(date: Date, lat: number, lon: number, timeZone: string): SunTimes {
  const noon = localNoon(date, timeZone)
  const times = SunCalc.getTimes(noon, lat, lon)

  const sunrise = validOrNull(times.sunrise)
  const sunset = validOrNull(times.sunset)
  const solarNoon = validOrNull(times.solarNoon)

  let polar: PolarCondition = null
  if (!sunrise && !sunset && solarNoon) {
    const noonAltitude = SunCalc.getPosition(solarNoon, lat, lon).altitude
    polar = noonAltitude > 0 ? 'midnight-sun' : 'polar-night'
  }

  return {
    sunrise,
    sunset,
    solarNoon,
    polar,

    // Golden hour evening: sun from 6° down to sunset
    goldenHourStart: validOrNull(times.goldenHour),
    goldenHourEnd: sunset,

    // Golden hour morning: sunrise until the sun reaches 6°
    goldenHourMorningStart: sunrise,
    goldenHourMorningEnd: validOrNull(times.goldenHourEnd),

    // Blue hour morning: nautical dawn (-12°) to civil dawn (-6°)
    blueHourMorningStart: validOrNull(times.nauticalDawn),
    blueHourMorningEnd: validOrNull(times.dawn),

    // Blue hour evening: civil dusk (-6°) to nautical dusk (-12°)
    blueHourEveningStart: validOrNull(times.dusk),
    blueHourEveningEnd: validOrNull(times.nauticalDusk),

    dawn: validOrNull(times.dawn),
    dusk: validOrNull(times.dusk),
    nauticalDawn: validOrNull(times.nauticalDawn),
    nauticalDusk: validOrNull(times.nauticalDusk),
    nightStart: validOrNull(times.night),
    nightEnd: validOrNull(times.nightEnd),
  }
}

/** Human-readable explanation for a polar day, or null. */
export function getPolarLabel(polar: PolarCondition): string | null {
  if (polar === 'midnight-sun') return 'Sun stays up all day'
  if (polar === 'polar-night') return 'Sun stays below the horizon'
  return null
}

/**
 * Get the sun's current position in degrees.
 * Altitude: degrees above horizon (negative = below).
 * Azimuth: degrees from north, clockwise (0 = N, 90 = E, 180 = S, 270 = W).
 */
export function getSunPosition(date: Date, lat: number, lon: number): SunPosition {
  const pos = SunCalc.getPosition(date, lat, lon)

  // SunCalc returns altitude in radians (from horizon)
  // SunCalc returns azimuth in radians (from south, clockwise) -- we convert to from-north
  const altitudeDeg = pos.altitude * (180 / Math.PI)
  const azimuthDeg = ((pos.azimuth * (180 / Math.PI)) + 180) % 360

  return {
    altitude: altitudeDeg,
    azimuth: azimuthDeg,
  }
}
