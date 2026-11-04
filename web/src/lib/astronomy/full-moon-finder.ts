import { addMonths } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import type { FullMoonEvent } from '@/types'
import { findMoonPhaseInstants, getMoonDistanceKm } from './moon-ephemeris'

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

/** A full moon closer than this (geocentric km) is a supermoon. */
export const SUPERMOON_DISTANCE_THRESHOLD_KM = 362_000

function localMonth(date: Date, timeZone: string): number {
  return new TZDate(date.getTime(), timeZone).getMonth() + 1
}

/**
 * Find all full moons within `months` of `startDate`.
 * Instants come from the Meeus elongation crossing 180° (≈1–2 min accuracy).
 */
export function findFullMoons(startDate: Date, months: number, timeZone: string): FullMoonEvent[] {
  const endDate = addMonths(startDate, months)

  return findMoonPhaseInstants(startDate, endDate, 'full').map((date) => {
    const distance = getMoonDistanceKm(date)
    return {
      date,
      name: 'Full Moon',
      folkName: FOLK_NAMES[localMonth(date, timeZone)] ?? 'Full Moon',
      isSupermoon: distance < SUPERMOON_DISTANCE_THRESHOLD_KM,
      distance,
    }
  })
}
