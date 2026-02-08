import { create } from 'zustand'
import { fetchWeatherForecast } from '@/lib/weather/api'
import type { WeatherForecast } from '@/lib/weather/api'
import { getCachedForecast, setCachedForecast } from '@/lib/weather/cache'
import {
  buildDailyPhotoScores,
  findClosestForecastHour,
  scoreWeatherConditions,
} from '@/lib/weather/scoring'
import type { DailyPhotoScore, ScoredConditions, WeatherProfile } from '@/lib/weather/scoring'

const CACHE_TTL_MS = 3 * 60 * 60 * 1000

interface WeatherState {
  forecast: WeatherForecast | null
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

let inFlightRequestKey: string | null = null
let inFlightRequest: Promise<WeatherForecast> | null = null

function getRequestKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(3)}:${longitude.toFixed(3)}`
}

export const useWeatherStore = create<WeatherStore>()((set, get) => ({
  forecast: null,
  dailyScores: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  fetchForecast: async (latitude, longitude, force = false) => {
    const cached = force ? null : getCachedForecast(latitude, longitude, CACHE_TTL_MS)
    if (cached) {
      set({
        forecast: cached,
        dailyScores: buildDailyPhotoScores(cached),
        isLoading: false,
        lastUpdated: cached.fetchedAt,
        error: null,
      })
      return
    }

    const requestKey = getRequestKey(latitude, longitude)

    set((state) => ({
      isLoading: !state.forecast,
      error: null,
    }))

    try {
      if (!inFlightRequest || inFlightRequestKey !== requestKey) {
        inFlightRequestKey = requestKey
        inFlightRequest = fetchWeatherForecast(latitude, longitude)
      }

      const forecast = await inFlightRequest
      setCachedForecast(forecast)

      set({
        forecast,
        dailyScores: buildDailyPhotoScores(forecast),
        isLoading: false,
        error: null,
        lastUpdated: forecast.fetchedAt,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch weather forecast'
      set({
        isLoading: false,
        error: message,
      })
    } finally {
      inFlightRequest = null
      inFlightRequestKey = null
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
