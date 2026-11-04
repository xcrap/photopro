import SunCalc from 'suncalc'
import type { MoonData } from '@/types'
import { localMidnight } from '@/lib/time/zone'
import { getMoonDistanceKm } from './moon-ephemeris'

const SYNODIC_MONTH = 29.53059 // Average length of a lunar cycle in days

/**
 * Map a phase value (0-1) to a human-readable phase name.
 */
function getPhaseName(phase: number): string {
  if (phase < 0.025 || phase >= 0.975) return 'New Moon'
  if (phase < 0.225) return 'Waxing Crescent'
  if (phase < 0.275) return 'First Quarter'
  if (phase < 0.475) return 'Waxing Gibbous'
  if (phase < 0.525) return 'Full Moon'
  if (phase < 0.725) return 'Waning Gibbous'
  if (phase < 0.775) return 'Last Quarter'
  return 'Waning Crescent'
}

/**
 * Map a phase value (0-1) to a moon phase emoji.
 */
function getPhaseEmoji(phase: number): string {
  if (phase < 0.025 || phase >= 0.975) return '\uD83C\uDF11' // New Moon
  if (phase < 0.225) return '\uD83C\uDF12' // Waxing Crescent
  if (phase < 0.275) return '\uD83C\uDF13' // First Quarter
  if (phase < 0.475) return '\uD83C\uDF14' // Waxing Gibbous
  if (phase < 0.525) return '\uD83C\uDF15' // Full Moon
  if (phase < 0.725) return '\uD83C\uDF16' // Waning Gibbous
  if (phase < 0.775) return '\uD83C\uDF17' // Last Quarter
  return '\uD83C\uDF18' // Waning Crescent
}

const HOUR_MS = 3_600_000
/** Moon's apparent radius + refraction correction used by SunCalc (radians). */
const MOON_HORIZON_CORRECTION = 0.133 * (Math.PI / 180)

export interface MoonRiseSet {
  rise: Date | null
  set: Date | null
}

/**
 * Moonrise/moonset during the 24 hours after `start`.
 * Same algorithm as SunCalc.getMoonTimes (2-hour quadratic fits), but with an explicit
 * start instant so the window can be the *location's* local midnight instead of the
 * device's.
 */
export function getMoonRiseSet(start: Date, lat: number, lon: number): MoonRiseSet {
  const t0 = start.getTime()
  const altitudeAt = (hours: number) =>
    SunCalc.getMoonPosition(new Date(t0 + hours * HOUR_MS), lat, lon).altitude - MOON_HORIZON_CORRECTION

  let h0 = altitudeAt(0)
  let rise: number | null = null
  let set: number | null = null

  for (let i = 1; i <= 24; i += 2) {
    const h1 = altitudeAt(i)
    const h2 = altitudeAt(i + 1)

    const a = (h0 + h2) / 2 - h1
    const b = (h2 - h0) / 2
    const xe = -b / (2 * a)
    const ye = (a * xe + b) * xe + h1
    const d = b * b - 4 * a * h1
    let roots = 0
    let x1 = 0
    let x2 = 0

    if (d >= 0) {
      const dx = Math.sqrt(d) / (Math.abs(a) * 2)
      x1 = xe - dx
      x2 = xe + dx
      if (Math.abs(x1) <= 1) roots++
      if (Math.abs(x2) <= 1) roots++
      if (x1 < -1) x1 = x2
    }

    if (roots === 1) {
      if (h0 < 0) rise = i + x1
      else set = i + x1
    } else if (roots === 2) {
      rise = i + (ye < 0 ? x2 : x1)
      set = i + (ye < 0 ? x1 : x2)
    }

    if (rise !== null && set !== null) break
    h0 = h2
  }

  return {
    rise: rise !== null ? new Date(t0 + rise * HOUR_MS) : null,
    set: set !== null ? new Date(t0 + set * HOUR_MS) : null,
  }
}

/**
 * Get comprehensive moon data at `date`, with moonrise/moonset for the local calendar
 * day (in `timeZone`) containing it.
 */
export function getMoonData(date: Date, lat: number, lon: number, timeZone: string): MoonData {
  const illumination = SunCalc.getMoonIllumination(date)
  const position = SunCalc.getMoonPosition(date, lat, lon)
  const moonTimes = getMoonRiseSet(localMidnight(date, timeZone), lat, lon)

  const phase = illumination.phase
  const fraction = illumination.fraction

  // Convert altitude/azimuth from radians to degrees
  // SunCalc moon azimuth is from south, clockwise -- convert to from-north
  const altitudeDeg = position.altitude * (180 / Math.PI)
  const azimuthDeg = ((position.azimuth * (180 / Math.PI)) + 180) % 360

  // Geocentric distance from the Meeus ephemeris (SunCalc's is too coarse)
  const distance = getMoonDistanceKm(date)

  // Moon age in days (phase * synodic month)
  const age = phase * SYNODIC_MONTH

  // Bright limb tilt angle for SVG rendering
  // illumination.angle (chi) = position angle of bright limb from celestial north, eastward (CCW on disk)
  // position.parallacticAngle (q) = angle from zenith to celestial north at the moon's position
  // chi - q = zenith angle of bright limb (CCW from zenith, astronomical convention)
  // SVG needs: negate for CW convention, offset by ±90° since the SVG draws
  // the bright limb at 3 o'clock (waxing) or 9 o'clock (waning) by default
  const isWaxing = phase <= 0.5
  const zenithAngleDeg = (illumination.angle - position.parallacticAngle) * (180 / Math.PI)
  const tiltAngle = -zenithAngleDeg + (isWaxing ? -90 : 90)

  return {
    phase,
    phaseName: getPhaseName(phase),
    illumination: fraction * 100,
    age,
    distance,
    emoji: getPhaseEmoji(phase),
    altitude: altitudeDeg,
    azimuth: azimuthDeg,
    tiltAngle,
    moonrise: moonTimes.rise,
    moonset: moonTimes.set,
  }
}
