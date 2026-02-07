import SunCalc from 'suncalc'
import { addYears } from 'date-fns'
import type { EclipseEvent } from '@/types'
import saoMiguelOverrides from '@/data/azores-sao-miguel-eclipse-overrides.json'

interface SaoMiguelOverrides {
  location: {
    name: string
    bounds: {
      latMin: number
      latMax: number
      lonMin: number
      lonMax: number
    }
  }
  solar: Record<string, number>
  lunar: Record<string, number>
}

const overrides = saoMiguelOverrides as SaoMiguelOverrides

function isWithinBounds(
  lat: number,
  lon: number,
  bounds: { latMin: number; latMax: number; lonMin: number; lonMax: number },
): boolean {
  const withinLat = lat >= bounds.latMin && lat <= bounds.latMax

  let withinLon: boolean
  if (bounds.lonMin <= bounds.lonMax) {
    withinLon = lon >= bounds.lonMin && lon <= bounds.lonMax
  } else {
    withinLon = lon >= bounds.lonMin || lon <= bounds.lonMax
  }

  return withinLat && withinLon
}

function parseDurationToMinutes(duration: string): number {
  const hours = Number(duration.match(/(\d+)\s*h/)?.[1] ?? 0)
  const minutes = Number(duration.match(/(\d+)\s*m/)?.[1] ?? 0)
  const seconds = Number(duration.match(/(\d+)\s*s/)?.[1] ?? 0)
  return (hours * 60) + minutes + (seconds / 60)
}

function getSaoMiguelPreciseOverride(eclipse: EclipseEvent, lat: number, lon: number): number | null {
  if (!isWithinBounds(lat, lon, overrides.location.bounds)) {
    return null
  }

  if (eclipse.category === 'solar') {
    return overrides.solar[eclipse.date.toISOString()] ?? null
  }

  if (eclipse.category === 'lunar') {
    return overrides.lunar[eclipse.date.toISOString()] ?? null
  }

  return null
}

/**
 * Lunar eclipses are globally visible from the night side of Earth.
 * For local precision we estimate how much of the eclipse duration the Moon
 * is above the horizon at the user's coordinates.
 */
function getLocalLunarVisibility(eclipse: EclipseEvent, lat: number, lon: number): number {
  const durationMinutes = Math.max(parseDurationToMinutes(eclipse.duration), 1)
  const halfDurationMs = (durationMinutes * 60 * 1000) / 2
  const startMs = eclipse.date.getTime() - halfDurationMs
  const endMs = eclipse.date.getTime() + halfDurationMs
  const stepMs = 5 * 60 * 1000

  let totalSamples = 0
  let visibleSamples = 0

  for (let t = startMs; t <= endMs; t += stepMs) {
    const moonPos = SunCalc.getMoonPosition(new Date(t), lat, lon)
    totalSamples += 1
    if (moonPos.altitude > 0) {
      visibleSamples += 1
    }
  }

  if (totalSamples === 0) return 0
  return Math.round((visibleSamples / totalSamples) * 100)
}

/**
 * Check if a geographic location falls within any of an eclipse's visibility regions.
 * Returns the visibility percentage for the matching region, or 0 if not visible.
 */
export function getVisibilityForLocation(
  eclipse: EclipseEvent,
  lat: number,
  lon: number,
): number {
  const overrideVisibility = getSaoMiguelPreciseOverride(eclipse, lat, lon)
  let bestVisibility = overrideVisibility ?? 0

  for (const region of eclipse.visibility) {
    if (isWithinBounds(lat, lon, region.bounds)) {
      bestVisibility = Math.max(bestVisibility, region.percentage)
    }
  }

  if (eclipse.category === 'lunar') {
    bestVisibility = Math.max(bestVisibility, getLocalLunarVisibility(eclipse, lat, lon))
  }

  return bestVisibility
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
