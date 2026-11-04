import type { HourlyForecast, WeatherForecast } from '@/lib/weather/api'

const CACHE_VERSION = 'v2'
const STORAGE_KEY = `photopro-weather-cache-${CACHE_VERSION}`
const LEGACY_STORAGE_KEYS = ['photopro-weather-cache-v1']
const MAX_CACHED_LOCATIONS = 10

interface SerializedWeatherForecast {
  latitude: number
  longitude: number
  timezone: string
  hourly: Array<Omit<HourlyForecast, 'time'> & { time: string }>
  fetchedAt: number
}

interface WeatherCacheMap {
  [locationKey: string]: SerializedWeatherForecast
}

/**
 * Cache key = the *requested* coordinates. Open-Meteo snaps responses to its grid, so the
 * coordinates in the response never match the ones the app asks for.
 */
export function getLocationKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(3)}:${longitude.toFixed(3)}`
}

function serializeForecast(forecast: WeatherForecast): SerializedWeatherForecast {
  return {
    ...forecast,
    hourly: forecast.hourly.map((point) => ({
      ...point,
      time: point.time.toISOString(),
    })),
  }
}

function deserializeForecast(serialized: SerializedWeatherForecast): WeatherForecast {
  return {
    ...serialized,
    hourly: serialized.hourly.map((point) => ({
      ...point,
      time: new Date(point.time),
    })),
  }
}

function readCacheMap(): WeatherCacheMap {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as WeatherCacheMap
  } catch {
    return {}
  }
}

function writeCacheMap(cache: WeatherCacheMap): void {
  if (typeof window === 'undefined') return

  const newestFirst = Object.entries(cache)
    .sort(([, a], [, b]) => b.fetchedAt - a.fetchedAt)
    .slice(0, MAX_CACHED_LOCATIONS)

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(newestFirst)))
    // v1 entries were keyed by the response's grid coordinates and never matched.
    for (const legacyKey of LEGACY_STORAGE_KEYS) window.localStorage.removeItem(legacyKey)
  } catch {
    // Storage full or unavailable: caching is best-effort.
  }
}

export function getCachedForecast(
  latitude: number,
  longitude: number,
  maxAgeMs: number,
): WeatherForecast | null {
  const cached = readCacheMap()[getLocationKey(latitude, longitude)]
  if (!cached) return null

  const ageMs = Date.now() - cached.fetchedAt
  if (ageMs > maxAgeMs) return null
  return deserializeForecast(cached)
}

export function getCachedForecastAnyAge(
  latitude: number,
  longitude: number,
): WeatherForecast | null {
  const cached = readCacheMap()[getLocationKey(latitude, longitude)]
  return cached ? deserializeForecast(cached) : null
}

/** Store a forecast under the coordinates that were *requested*. */
export function setCachedForecast(
  latitude: number,
  longitude: number,
  forecast: WeatherForecast,
): void {
  const cache = readCacheMap()
  cache[getLocationKey(latitude, longitude)] = serializeForecast(forecast)
  writeCacheMap(cache)
}
