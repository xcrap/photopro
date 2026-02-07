import { addYears } from 'date-fns'
import type { EclipseEvent } from '@/types'

/**
 * Check if a geographic location falls within any of an eclipse's visibility regions.
 * Returns the visibility percentage for the matching region, or 0 if not visible.
 */
export function getVisibilityForLocation(
  eclipse: EclipseEvent,
  lat: number,
  lon: number,
): number {
  for (const region of eclipse.visibility) {
    const { bounds } = region

    const withinLat = lat >= bounds.latMin && lat <= bounds.latMax

    // Handle longitude wrapping (e.g., bounds spanning the antimeridian)
    let withinLon: boolean
    if (bounds.lonMin <= bounds.lonMax) {
      withinLon = lon >= bounds.lonMin && lon <= bounds.lonMax
    } else {
      // Wraps around the antimeridian (e.g., lonMin: 160, lonMax: -160)
      withinLon = lon >= bounds.lonMin || lon <= bounds.lonMax
    }

    if (withinLat && withinLon) {
      return region.percentage
    }
  }

  return 0
}

/**
 * Filter and return upcoming eclipses (both lunar and solar) within a specified year range from today.
 * Results are sorted by date.
 */
export function getUpcomingEclipses(
  lunarData: EclipseEvent[],
  solarData: EclipseEvent[],
  yearsRange: number,
): EclipseEvent[] {
  const now = new Date()
  const endDate = addYears(now, yearsRange)

  const allEclipses = [...lunarData, ...solarData]

  const upcoming = allEclipses.filter((eclipse) => {
    const eclipseDate = eclipse.date instanceof Date ? eclipse.date : new Date(eclipse.date)
    return eclipseDate >= now && eclipseDate <= endDate
  })

  upcoming.sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date)
    const dateB = b.date instanceof Date ? b.date : new Date(b.date)
    return dateA.getTime() - dateB.getTime()
  })

  return upcoming
}
