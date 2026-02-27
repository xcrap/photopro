import SunCalc from 'suncalc'
import type { SunTimes, SunPosition } from '@/types'

/**
 * Get comprehensive sun times for a given date and location.
 * Includes golden hour and blue hour calculations for photography.
 */
export function getSunTimes(date: Date, lat: number, lon: number): SunTimes {
  const times = SunCalc.getTimes(date, lat, lon)

  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    solarNoon: times.solarNoon,

    // Golden hour evening: SunCalc's goldenHour is the start of evening golden hour
    goldenHourStart: times.goldenHour,
    goldenHourEnd: times.sunset,

    // Golden hour morning: sunrise to ~45 min after (sun altitude < 6 degrees)
    // Approximated as sunrise to goldenHourEnd (SunCalc's golden hour end = morning golden hour end)
    goldenHourMorningStart: times.sunrise,
    goldenHourMorningEnd: times.goldenHourEnd,

    // Blue hour morning: nautical dawn to civil dawn
    // Sun is between -6 degrees and -4 degrees below horizon
    blueHourMorningStart: times.nauticalDawn,
    blueHourMorningEnd: times.dawn,

    // Blue hour evening: civil dusk to nautical dusk
    blueHourEveningStart: times.dusk,
    blueHourEveningEnd: times.nauticalDusk,

    dawn: times.dawn,
    dusk: times.dusk,
    nauticalDawn: times.nauticalDawn,
    nauticalDusk: times.nauticalDusk,
    nightStart: times.night,
    nightEnd: times.nightEnd,
  }
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
