import SunCalc from 'suncalc'
import { addDays, addMonths } from 'date-fns'
import type { FullMoonEvent } from '@/types'

/** Folk names for full moons by month (1-indexed). */
const FOLK_NAMES: Record<number, string> = {
  1: 'Wolf Moon',
  2: 'Snow Moon',
  3: 'Worm Moon',
  4: 'Pink Moon',
  5: 'Flower Moon',
  6: 'Strawberry Moon',
  7: 'Buck Moon',
  8: 'Sturgeon Moon',
  9: 'Harvest Moon',
  10: "Hunter's Moon",
  11: 'Beaver Moon',
  12: 'Cold Moon',
}

/** Threshold for detecting a full moon (phase distance from 0.5). */
const FULL_MOON_THRESHOLD = 0.02

/**
 * Binary search for the exact moment when the moon phase is closest to 0.5 (full moon).
 * Searches within the given date range with millisecond precision.
 */
function refineToPeakFullMoon(startDate: Date, endDate: Date): Date {
  let lo = startDate.getTime()
  let hi = endDate.getTime()

  // Binary search: narrow down to within 1 second
  for (let i = 0; i < 50; i++) {
    const mid = Math.floor((lo + hi) / 2)
    const midDate = new Date(mid)

    const phaseMid = SunCalc.getMoonIllumination(midDate).phase
    const phaseNext = SunCalc.getMoonIllumination(new Date(mid + 1000)).phase

    // We want the point closest to phase 0.5
    const distMid = Math.abs(phaseMid - 0.5)
    const distNext = Math.abs(phaseNext - 0.5)

    if (distNext < distMid) {
      lo = mid
    } else {
      hi = mid
    }

    if (hi - lo < 1000) break
  }

  return new Date(Math.floor((lo + hi) / 2))
}

/**
 * Find all full moons within a date range.
 * Iterates day by day, detecting when the moon phase crosses 0.5.
 * Uses binary search to refine the exact full moon time.
 */
export function findFullMoons(startDate: Date, months: number): FullMoonEvent[] {
  const endDate = addMonths(startDate, months)
  const fullMoons: FullMoonEvent[] = []

  let currentDate = new Date(startDate)
  let prevPhase = SunCalc.getMoonIllumination(currentDate).phase

  while (currentDate < endDate) {
    const nextDate = addDays(currentDate, 1)
    const currentPhase = SunCalc.getMoonIllumination(nextDate).phase

    // Detect full moon: phase is within threshold of 0.5
    const isNearFull = Math.abs(currentPhase - 0.5) < FULL_MOON_THRESHOLD

    // Also detect crossing: phase went from below 0.5 to above 0.5
    const crossedFull = prevPhase < 0.5 && currentPhase >= 0.5

    if (isNearFull || crossedFull) {
      // Refine to exact peak using binary search
      const exactDate = refineToPeakFullMoon(currentDate, nextDate)

      // Avoid duplicate detections (must be at least 20 days from last detection)
      const lastFullMoon = fullMoons[fullMoons.length - 1]
      const daysSinceLast = lastFullMoon
        ? (exactDate.getTime() - lastFullMoon.date.getTime()) / (1000 * 60 * 60 * 24)
        : Infinity

      if (daysSinceLast > 20) {
        const month = exactDate.getMonth() + 1
        const folkName = FOLK_NAMES[month] ?? 'Full Moon'

        // Get moon distance at exact full moon time
        const position = SunCalc.getMoonPosition(exactDate, 0, 0)

        fullMoons.push({
          date: exactDate,
          name: `Full Moon`,
          folkName,
          isSupermoon: false, // Will be updated by special-events if applicable
          distance: position.distance,
        })
      }
    }

    prevPhase = currentPhase
    currentDate = nextDate
  }

  return fullMoons
}
