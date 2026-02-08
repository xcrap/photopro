import { isCometVisible } from './visibility'
import cometsData from '@/data/comets.json'

export interface Comet {
  id: string
  name: string
  peakStart: string
  peakEnd: string
  peakDate: string
  magnitude: number
  visibility: {
    hemisphere?: string
    minLatitude?: number
    declinationRange?: { min: number; max: number }
  }
  bestViewingTime: string
  direction: string
  description: string
}

export interface CometEvent extends Comet {
  peakStartDate: Date
  peakEndDate: Date
  peakDateParsed: Date
  isActive: boolean
  isUpcoming: boolean
}

/**
 * Get active and upcoming comets for a given location.
 */
export function getComets(userLatitude: number): CometEvent[] {
  const comets = cometsData as Comet[]
  const now = new Date()

  return comets
    .filter((comet) => isCometVisible(comet, userLatitude))
    .map((comet) => {
      const peakStartDate = new Date(comet.peakStart)
      const peakEndDate = new Date(comet.peakEnd)
      const peakDateParsed = new Date(comet.peakDate)

      const isActive = now >= peakStartDate && now <= peakEndDate
      const isUpcoming = now < peakStartDate

      return {
        ...comet,
        peakStartDate,
        peakEndDate,
        peakDateParsed,
        isActive,
        isUpcoming,
      }
    })
    .filter((comet) => comet.isActive || comet.isUpcoming)
    .sort((a, b) => a.peakDateParsed.getTime() - b.peakDateParsed.getTime())
}

/**
 * Get magnitude rating (visibility description).
 */
export function getMagnitudeRating(magnitude: number): string {
  if (magnitude <= 0) return 'Spectacular (very bright)'
  if (magnitude <= 2) return 'Naked eye visible'
  if (magnitude <= 4) return 'Visible with binoculars'
  if (magnitude <= 6) return 'Requires telescope'
  return 'Faint'
}
