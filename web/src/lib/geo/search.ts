import { isValidTimeZone } from '@/lib/time/zone'

/**
 * Place search through Open-Meteo's free geocoder (no key, browser-friendly, CORS
 * enabled). It returns each place's IANA time zone too.
 */

export interface PlaceResult {
  id: number
  name: string
  /** "Region, Country" */
  detail: string
  latitude: number
  longitude: number
  timeZone: string | null
}

interface GeocodingResponse {
  results?: Array<{
    id: number
    name: string
    latitude: number
    longitude: number
    country?: string
    admin1?: string
    timezone?: string
  }>
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const name = query.trim()
  if (name.length < 2) return []

  const params = new URLSearchParams({ name, count: '8', language: 'en', format: 'json' })
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal })
  if (!response.ok) throw new Error(`Place search failed (${response.status})`)

  const data = (await response.json()) as GeocodingResponse
  return (data.results ?? []).map((result) => ({
    id: result.id,
    name: result.name,
    detail: [result.admin1, result.country].filter(Boolean).join(', '),
    latitude: result.latitude,
    longitude: result.longitude,
    timeZone: isValidTimeZone(result.timezone) ? result.timezone : null,
  }))
}
