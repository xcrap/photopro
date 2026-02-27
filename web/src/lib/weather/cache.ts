import type { HourlyForecast, WeatherForecast } from '@/lib/weather/api'

const CACHE_VERSION = 'v1'
const STORAGE_KEY = `photopro-weather-cache-${CACHE_VERSION}`

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

function getLocationKey(latitude: number, longitude: number): string {
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

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return {}

  try {
    return JSON.parse(raw) as WeatherCacheMap
  } catch {
    return {}
  }
}

function writeCacheMap(cache: WeatherCacheMap): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
}

export function getCachedForecast(
  latitude: number,
  longitude: number,
  maxAgeMs: number,
): WeatherForecast | null {
  const key = getLocationKey(latitude, longitude)
  const cache = readCacheMap()
  const cached = cache[key]
  if (!cached) return null

  const ageMs = Date.now() - cached.fetchedAt
  if (ageMs > maxAgeMs) return null
  return deserializeForecast(cached)
}

export function getCachedForecastAnyAge(
  latitude: number,
  longitude: number,
): WeatherForecast | null {
  const key = getLocationKey(latitude, longitude)
  const cache = readCacheMap()
  const cached = cache[key]
  if (!cached) return null
  return deserializeForecast(cached)
}

export function setCachedForecast(forecast: WeatherForecast): void {
  const key = getLocationKey(forecast.latitude, forecast.longitude)
  const cache = readCacheMap()
  cache[key] = serializeForecast(forecast)
  writeCacheMap(cache)
}

export function clearCachedForecast(latitude: number, longitude: number): void {
  const key = getLocationKey(latitude, longitude)
  const cache = readCacheMap()
  if (!(key in cache)) return
  delete cache[key]
  writeCacheMap(cache)
}
