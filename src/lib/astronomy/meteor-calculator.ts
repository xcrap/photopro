import { findDateForSolarLongitude } from './solar-longitude'
import { getMaxAltitude, getVisibilityRating } from './visibility'
import type { VisibilityRating } from './visibility'
import meteorShowersData from '@/data/meteor-showers.json'

export interface MeteorShower {
  id: string
  name: string
  peakSolarLongitude: number
  activeStartSolarLongitude: number
  activeEndSolarLongitude: number
  radiant: { ra: number; dec: number }
  velocity: number
  zhr: number
  rating: string
  parentBody: string
  description: string
}

export interface MeteorShowerEvent extends MeteorShower {
  peakDate: Date
  activeStart: Date
  activeEnd: Date
  visibility: VisibilityRating
  maxAltitude: number
  isActive: boolean
}

/**
 * Get all meteor showers with calculated dates for a given year and location.
 */
export function getMeteorShowers(
  year: number,
  userLatitude: number,
): MeteorShowerEvent[] {
  const showers = meteorShowersData as MeteorShower[]

  return showers
    .map((shower) => {
      const peakDate = findDateForSolarLongitude(
        shower.peakSolarLongitude,
        year,
      )
      const activeStart = findDateForSolarLongitude(
        shower.activeStartSolarLongitude,
        year,
      )
      let activeEnd = findDateForSolarLongitude(
        shower.activeEndSolarLongitude,
        year,
      )

      if (activeEnd < activeStart) {
        activeEnd = findDateForSolarLongitude(
          shower.activeEndSolarLongitude,
          year + 1,
        )
      }

      const maxAltitude = getMaxAltitude(userLatitude, shower.radiant.dec)
      const visibility = getVisibilityRating(maxAltitude)

      const now = new Date()
      const isActive = now >= activeStart && now <= activeEnd

      return {
        ...shower,
        peakDate,
        activeStart,
        activeEnd,
        visibility,
        maxAltitude,
        isActive,
      }
    })
    .filter((shower) => shower.visibility !== 'not-visible')
    .sort((a, b) => a.peakDate.getTime() - b.peakDate.getTime())
}

/**
 * Get upcoming meteor showers from a given date.
 */
export function getUpcomingMeteorShowers(
  fromDate: Date,
  months: number,
  userLatitude: number,
): MeteorShowerEvent[] {
  const year = fromDate.getFullYear()
  const endDate = new Date(fromDate.getTime() + months * 30 * 86400000)

  const thisYear = getMeteorShowers(year, userLatitude)
  const nextYear = getMeteorShowers(year + 1, userLatitude)

  return [...thisYear, ...nextYear]
    .filter(
      (shower) => shower.peakDate >= fromDate && shower.peakDate <= endDate,
    )
    .sort((a, b) => a.peakDate.getTime() - b.peakDate.getTime())
}

/**
 * Get the next upcoming meteor shower.
 */
export function getNextMeteorShower(
  fromDate: Date,
  userLatitude: number,
): MeteorShowerEvent | null {
  const upcoming = getUpcomingMeteorShowers(fromDate, 12, userLatitude)
  return upcoming[0] ?? null
}

/**
 * Get ZHR rating (1-3 stars).
 */
export function getZhrRating(zhr: number): number {
  if (zhr >= 100) return 3
  if (zhr >= 40) return 2
  return 1
}
