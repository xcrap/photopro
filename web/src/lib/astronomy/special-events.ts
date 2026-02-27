import SunCalc from 'suncalc'
import { addDays, addMonths } from 'date-fns'
import type { SpecialEvent, FullMoonEvent } from '@/types'
import { findFullMoons } from './full-moon-finder'

/**
 * Average perigee distance of the moon in km.
 * A supermoon is typically defined as a full moon occurring within 90% of perigee.
 * We use a threshold of ~362,000 km as a practical cutoff.
 */
const SUPERMOON_DISTANCE_THRESHOLD = 362000

/**
 * Threshold for detecting a new moon (phase distance from 0).
 */
const NEW_MOON_THRESHOLD = 0.02

/**
 * Find new moons within a date range by iterating day by day.
 */
function findNewMoons(startDate: Date, months: number): Date[] {
  const endDate = addMonths(startDate, months)
  const newMoons: Date[] = []

  let currentDate = new Date(startDate)
  let prevPhase = SunCalc.getMoonIllumination(currentDate).phase

  while (currentDate < endDate) {
    const nextDate = addDays(currentDate, 1)
    const currentPhase = SunCalc.getMoonIllumination(nextDate).phase

    // Detect new moon: phase near 0 (or near 1, since 0 and 1 are the same point)
    const isNearNew = currentPhase < NEW_MOON_THRESHOLD || currentPhase > (1 - NEW_MOON_THRESHOLD)

    // Also detect wrapping: phase went from high (>0.9) to low (<0.1)
    const crossedNew = prevPhase > 0.9 && currentPhase < 0.1

    if (isNearNew || crossedNew) {
      // Avoid duplicate detections
      const lastNewMoon = newMoons[newMoons.length - 1]
      const daysSinceLast = lastNewMoon
        ? (nextDate.getTime() - lastNewMoon.getTime()) / (1000 * 60 * 60 * 24)
        : Infinity

      if (daysSinceLast > 20) {
        newMoons.push(nextDate)
      }
    }

    prevPhase = currentPhase
    currentDate = nextDate
  }

  return newMoons
}

/**
 * Detect supermoons from a list of full moon events.
 * A supermoon occurs when the full moon is near perigee (closest approach to Earth).
 */
function findSupermoons(fullMoons: FullMoonEvent[]): SpecialEvent[] {
  const events: SpecialEvent[] = []

  for (const fullMoon of fullMoons) {
    const distance = fullMoon.distance
    if (distance !== undefined && distance < SUPERMOON_DISTANCE_THRESHOLD) {
      events.push({
        date: fullMoon.date,
        type: 'supermoon',
        name: `Supermoon (${fullMoon.folkName})`,
        description: `Full moon at ${Math.round(distance).toLocaleString()} km - appears ~7% larger and ~15% brighter than average`,
      })
    }
  }

  return events
}

/**
 * Detect blue moons (2nd full moon in a calendar month).
 */
function findBlueMoons(fullMoons: FullMoonEvent[]): SpecialEvent[] {
  const events: SpecialEvent[] = []

  // Group full moons by year-month
  const byMonth = new Map<string, FullMoonEvent[]>()
  for (const fm of fullMoons) {
    const key = `${fm.date.getFullYear()}-${fm.date.getMonth()}`
    const group = byMonth.get(key)
    if (group) {
      group.push(fm)
    } else {
      byMonth.set(key, [fm])
    }
  }

  for (const group of byMonth.values()) {
    if (group.length >= 2) {
      // Sort by date within the month
      group.sort((a, b) => a.date.getTime() - b.date.getTime())
      const blueMoon = group[1] // Second full moon
      events.push({
        date: blueMoon.date,
        type: 'blue-moon',
        name: 'Blue Moon',
        description: `Second full moon of the month (${blueMoon.folkName}) - a rare occurrence happening roughly every 2.7 years`,
      })
    }
  }

  return events
}

/**
 * Detect black moons (2nd new moon in a calendar month).
 */
function findBlackMoons(newMoons: Date[]): SpecialEvent[] {
  const events: SpecialEvent[] = []

  // Group new moons by year-month
  const byMonth = new Map<string, Date[]>()
  for (const nm of newMoons) {
    const key = `${nm.getFullYear()}-${nm.getMonth()}`
    const group = byMonth.get(key)
    if (group) {
      group.push(nm)
    } else {
      byMonth.set(key, [nm])
    }
  }

  for (const group of byMonth.values()) {
    if (group.length >= 2) {
      group.sort((a, b) => a.getTime() - b.getTime())
      const blackMoon = group[1] // Second new moon
      events.push({
        date: blackMoon,
        type: 'black-moon',
        name: 'Black Moon',
        description: 'Second new moon of the month - an uncommon event ideal for deep sky observation and astrophotography',
      })
    }
  }

  return events
}

/**
 * Find all special astronomical events within a date range.
 * Includes: supermoons, blue moons, and black moons.
 */
export function findSpecialEvents(startDate: Date, months: number): SpecialEvent[] {
  const fullMoons = findFullMoons(startDate, months)
  const newMoons = findNewMoons(startDate, months)

  const events: SpecialEvent[] = [
    ...findSupermoons(fullMoons),
    ...findBlueMoons(fullMoons),
    ...findBlackMoons(newMoons),
  ]

  // Sort by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime())

  return events
}
