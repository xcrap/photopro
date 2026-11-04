import { create } from 'zustand'
import { fetchWeatherForecast } from '@/lib/weather/api'
import type { WeatherForecast } from '@/lib/weather/api'
import { getCachedForecast, getCachedForecastAnyAge, getLocationKey, setCachedForecast } from '@/lib/weather/cache'
import {
  buildDailyPhotoScores,
  findClosestForecastHour,
  scoreWeatherConditions,
} from '@/lib/weather/scoring'
import type { DailyPhotoScore, ScoredConditions, WeatherProfile } from '@/lib/weather/scoring'
import { isValidTimeZone } from '@/lib/time/zone'
import { useLocationStore } from '@/stores/location-store'

const CACHE_TTL_MS = 3 * 60 * 60 * 1000

interface WeatherState {
  forecast: WeatherForecast | null
  /** Requested-coordinate key of the forecast currently shown. */
  forecastKey: string | null
  dailyScores: DailyPhotoScore[]
  isLoading: boolean
  error: string | null
  lastUpdated: number | null
}

interface WeatherActions {
  fetchForecast: (latitude: number, longitude: number, force?: boolean) => Promise<void>
  getScoreForTime: (time: Date, profile: WeatherProfile, moonIllumination?: number) => ScoredConditions | null
  getTopDays: (count: number) => DailyPhotoScore[]
}

type WeatherStore = WeatherState & WeatherActions

const inFlightRequests = new Map<string, Promise<WeatherForecast>>()
/** Key of the most recent fetchForecast call; older responses are ignored. */
let latestRequestKey: string | null = null

function learnTimeZone(latitude: number, longitude: number, forecast: WeatherForecast): void {
  if (isValidTimeZone(forecast.timezone)) {
    useLocationStore.getState().learnTimeZone(latitude, longitude, forecast.timezone)
  }
}

export const useWeatherStore = create<WeatherStore>()((set, get) => ({
  forecast: null,
  forecastKey: null,
  dailyScores: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  fetchForecast: async (latitude, longitude, force = false) => {
    const requestKey = getLocationKey(latitude, longitude)
    latestRequestKey = requestKey

    const cached = force ? null : getCachedForecast(latitude, longitude, CACHE_TTL_MS)
    if (cached) {
      learnTimeZone(latitude, longitude, cached)
      // Recompute even for the same forecast: candidate hours that have passed drop off.
      set({
        forecast: cached,
        forecastKey: requestKey,
        dailyScores: buildDailyPhotoScores(cached),
        isLoading: false,
        lastUpdated: cached.fetchedAt,
        error: null,
      })
      return
    }

    set((state) => ({
      // Never show another location's forecast while this one loads.
      ...(state.forecastKey !== requestKey
        ? { forecast: null, forecastKey: null, dailyScores: [], lastUpdated: null }
        : {}),
      isLoading: true,
      error: null,
    }))

    let request = inFlightRequests.get(requestKey)
    if (!request) {
      request = fetchWeatherForecast(latitude, longitude)
      inFlightRequests.set(requestKey, request)
    }

    try {
      const forecast = await request
      setCachedForecast(latitude, longitude, forecast)
      learnTimeZone(latitude, longitude, forecast)

      if (latestRequestKey !== requestKey) return

      set({
        forecast,
        forecastKey: requestKey,
        dailyScores: buildDailyPhotoScores(forecast),
        isLoading: false,
        error: null,
        lastUpdated: forecast.fetchedAt,
      })
    } catch (error) {
      if (latestRequestKey !== requestKey) return

      const staleCached = getCachedForecastAnyAge(latitude, longitude)
      if (staleCached) {
        set({
          forecast: staleCached,
          forecastKey: requestKey,
          dailyScores: buildDailyPhotoScores(staleCached),
          isLoading: false,
          lastUpdated: staleCached.fetchedAt,
          error: 'Live weather unavailable. Showing older cached forecast.',
        })
        return
      }

      const message = error instanceof Error ? error.message : 'Unable to fetch weather forecast'
      set({
        isLoading: false,
        error: message,
      })
    } finally {
      inFlightRequests.delete(requestKey)
    }
  },

  getScoreForTime: (time, profile, moonIllumination) => {
    const forecast = get().forecast
    if (!forecast) return null
    const hourlyWeather = findClosestForecastHour(forecast.hourly, time)
    if (!hourlyWeather) return null
    return scoreWeatherConditions(profile, hourlyWeather, moonIllumination)
  },

  getTopDays: (count) =>
    [...get().dailyScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, count),
}))
