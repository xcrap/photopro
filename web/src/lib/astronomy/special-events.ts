import { addMonths } from 'date-fns'
import type { SpecialEvent, FullMoonEvent } from '@/types'
import { localMonthKey } from '@/lib/time/zone'
import { findFullMoons } from './full-moon-finder'
import { findMoonPhaseInstants } from './moon-ephemeris'

/**
 * Detect supermoons: full moons closer than 362,000 km (Meeus distance).
 */
function findSupermoons(fullMoons: FullMoonEvent[]): SpecialEvent[] {
  return fullMoons
    .filter((fullMoon) => fullMoon.isSupermoon)
    .map((fullMoon) => ({
      date: fullMoon.date,
      type: 'supermoon' as const,
      name: `Supermoon (${fullMoon.folkName})`,
      description: `Full moon at ${Math.round(fullMoon.distance).toLocaleString('en-US')} km - appears ~7% larger and ~15% brighter than average`,
    }))
}

/** Group instants by local calendar month and return the second of each month. */
function secondInSameMonth<T>(items: T[], getDate: (item: T) => Date, timeZone: string): T[] {
  const byMonth = new Map<string, T[]>()
  for (const item of items) {
    const key = localMonthKey(getDate(item), timeZone)
    const group = byMonth.get(key)
    if (group) {
      group.push(item)
    } else {
      byMonth.set(key, [item])
    }
  }

  const seconds: T[] = []
  for (const group of byMonth.values()) {
    if (group.length >= 2) {
      group.sort((a, b) => getDate(a).getTime() - getDate(b).getTime())
      seconds.push(group[1])
    }
  }
  return seconds
}

/**
 * Detect blue moons (2nd full moon in a calendar month, location time zone).
 */
function findBlueMoons(fullMoons: FullMoonEvent[], timeZone: string): SpecialEvent[] {
  return secondInSameMonth(fullMoons, (fm) => fm.date, timeZone).map((blueMoon) => ({
    date: blueMoon.date,
    type: 'blue-moon' as const,
    name: 'Blue Moon',
    description: `Second full moon of the month (${blueMoon.folkName}) - a rare occurrence happening roughly every 2.7 years`,
  }))
}

/**
 * Detect black moons (2nd new moon in a calendar month, location time zone).
 */
function findBlackMoons(newMoons: Date[], timeZone: string): SpecialEvent[] {
  return secondInSameMonth(newMoons, (date) => date, timeZone).map((blackMoon) => ({
    date: blackMoon,
    type: 'black-moon' as const,
    name: 'Black Moon',
    description: 'Second new moon of the month - an uncommon event ideal for deep sky observation and astrophotography',
  }))
}

/**
 * Find all special astronomical events within a date range.
 * Includes: supermoons, blue moons, and black moons.
 *
 * Month grouping needs whole months, so the scan starts one month early and results
 * before `startDate` are dropped afterwards.
 */
export function findSpecialEvents(startDate: Date, months: number, timeZone: string): SpecialEvent[] {
  const scanStart = addMonths(startDate, -1)
  const scanEnd = addMonths(startDate, months)
  const fullMoons = findFullMoons(scanStart, months + 1, timeZone)
  const newMoons = findMoonPhaseInstants(scanStart, scanEnd, 'new')

  const events: SpecialEvent[] = [
    ...findSupermoons(fullMoons),
    ...findBlueMoons(fullMoons, timeZone),
    ...findBlackMoons(newMoons, timeZone),
  ].filter((event) => event.date.getTime() >= startDate.getTime())

  events.sort((a, b) => a.date.getTime() - b.date.getTime())
  return events
}
