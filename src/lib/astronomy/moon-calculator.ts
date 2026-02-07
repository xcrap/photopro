import SunCalc from 'suncalc'
import type { MoonData } from '@/types'

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

/**
 * Get comprehensive moon data for a given date and location.
 */
export function getMoonData(date: Date, lat: number, lon: number): MoonData {
  const illumination = SunCalc.getMoonIllumination(date)
  const position = SunCalc.getMoonPosition(date, lat, lon)
  const moonTimes = SunCalc.getMoonTimes(date, lat, lon)

  const phase = illumination.phase
  const fraction = illumination.fraction

  // Convert altitude/azimuth from radians to degrees
  // SunCalc moon azimuth is from south, clockwise -- convert to from-north
  const altitudeDeg = position.altitude * (180 / Math.PI)
  const azimuthDeg = ((position.azimuth * (180 / Math.PI)) + 180) % 360

  // Moon distance in km from parallax
  // SunCalc provides distance in km directly via position.distance
  const distance = position.distance

  // Moon age in days (phase * synodic month)
  const age = phase * SYNODIC_MONTH

  return {
    phase,
    phaseName: getPhaseName(phase),
    illumination: fraction * 100,
    age,
    distance,
    emoji: getPhaseEmoji(phase),
    altitude: altitudeDeg,
    azimuth: azimuthDeg,
    moonrise: moonTimes.rise ?? null,
    moonset: moonTimes.set ?? null,
  }
}
