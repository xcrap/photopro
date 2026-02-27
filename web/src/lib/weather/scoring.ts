import { format } from 'date-fns'
import type { HourlyForecast, WeatherForecast } from '@/lib/weather/api'
import type { ProximityEvent } from '@/types'

export type WeatherProfile = 'sunset' | 'night'

export interface Score {
  score: number
  breakdown: {
    windScore: number
    highCloudScore?: number
    blockingCloudScore?: number
    clearSkyScore?: number
    humidityScore?: number
    moonScore?: number
  }
}

export interface ScoredConditions extends Score {
  profile: WeatherProfile
  label: string
  summary: string
  icon: string
}

export interface DailyPhotoScore {
  date: Date
  profile: WeatherProfile
  score: number
  icon: string
  label: string
  summary: string
  observationTime: Date
  conditions: {
    windSpeed: number
    cloudCover: number
    humidity: number
  }
}

interface WindThresholds {
  ideal: number
  max: number
}

const GOOD_WEATHER_SCORE = 70
const MAX_FORECAST_MATCH_HOURS = 2

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

function scoreWind(speedKmh: number, thresholds: WindThresholds): number {
  if (speedKmh <= thresholds.ideal) return 100
  if (speedKmh >= thresholds.max) return 0
  return Math.round(100 - ((speedKmh - thresholds.ideal) / (thresholds.max - thresholds.ideal)) * 100)
}

function scoreHighClouds(cloudCoverHigh: number): number {
  const idealCenter = 55
  return Math.round(clamp(100 - Math.abs(cloudCoverHigh - idealCenter) * 2))
}

function scoreHumidity(relativeHumidity: number): number {
  const ideal = 65
  const max = 95
  if (relativeHumidity <= ideal) return 100
  if (relativeHumidity >= max) return 0
  return Math.round(100 - ((relativeHumidity - ideal) / (max - ideal)) * 100)
}

function scoreSunsetConditions(weather: HourlyForecast): Score {
  const windScore = scoreWind(weather.wind_speed_10m, { ideal: 9, max: 14 })
  const highCloudScore = scoreHighClouds(weather.cloud_cover_high)
  const blockingCloudScore = 100 - Math.max(weather.cloud_cover_low, weather.cloud_cover_mid)

  return {
    score: Math.round(windScore * 0.4 + highCloudScore * 0.3 + blockingCloudScore * 0.3),
    breakdown: { windScore, highCloudScore, blockingCloudScore },
  }
}

function scoreNightConditions(weather: HourlyForecast, moonIllumination?: number): Score {
  const windScore = scoreWind(weather.wind_speed_10m, { ideal: 8, max: 12 })
  const clearSkyScore = 100 - weather.cloud_cover
  const humidityScore = scoreHumidity(weather.relative_humidity_2m)
  const moonScore = moonIllumination !== undefined ? (100 - moonIllumination) : 100

  return {
    score: Math.round(windScore * 0.3 + clearSkyScore * 0.4 + humidityScore * 0.15 + moonScore * 0.15),
    breakdown: { windScore, clearSkyScore, humidityScore, moonScore },
  }
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent'
  if (score >= GOOD_WEATHER_SCORE) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Poor'
}

export function getScoreIcon(score: number): string {
  if (score >= 85) return '☀️'
  if (score >= GOOD_WEATHER_SCORE) return '🌤️'
  if (score >= 50) return '⛅'
  return '🌥️'
}

function summarizeSunset(score: Score): string {
  const { windScore = 0, highCloudScore = 0, blockingCloudScore = 0 } = score.breakdown
  if (blockingCloudScore < 45) return 'Low/mid clouds may block color'
  if (highCloudScore >= 75 && windScore >= 70) return 'Light wind, ideal red-sky setup'
  if (windScore < 50) return 'Wind may shake long-lens sunset shots'
  return 'Mixed sunset conditions'
}

function summarizeNight(score: Score): string {
  const { clearSkyScore = 0, windScore = 0, humidityScore = 0 } = score.breakdown
  if (clearSkyScore < 55) return 'Clouds likely limit night visibility'
  if (windScore < 55) return 'Wind may blur long exposures'
  if (humidityScore < 50) return 'Humidity may reduce sharpness'
  return 'Clear and stable for long exposures'
}

export function scoreWeatherConditions(
  profile: WeatherProfile,
  hourlyWeather: HourlyForecast,
  moonIllumination?: number,
): ScoredConditions {
  const baseScore =
    profile === 'sunset'
      ? scoreSunsetConditions(hourlyWeather)
      : scoreNightConditions(hourlyWeather, moonIllumination)

  return {
    ...baseScore,
    profile,
    label: getScoreLabel(baseScore.score),
    icon: getScoreIcon(baseScore.score),
    summary: profile === 'sunset' ? summarizeSunset(baseScore) : summarizeNight(baseScore),
  }
}

export function findClosestForecastHour(
  hourlyForecasts: HourlyForecast[],
  targetTime: Date,
  maxHoursDiff = MAX_FORECAST_MATCH_HOURS,
): HourlyForecast | null {
  if (hourlyForecasts.length === 0) return null

  let bestMatch: HourlyForecast | null = null
  let bestDifference = Number.POSITIVE_INFINITY

  for (const hourly of hourlyForecasts) {
    const difference = Math.abs(hourly.time.getTime() - targetTime.getTime())
    if (difference < bestDifference) {
      bestMatch = hourly
      bestDifference = difference
    }
  }

  if (!bestMatch) return null
  const maxDifferenceMs = maxHoursDiff * 60 * 60 * 1000
  return bestDifference <= maxDifferenceMs ? bestMatch : null
}

export function getWeatherProfileForProximityEvent(event: ProximityEvent): WeatherProfile {
  return event.type.includes('sunset') || event.type.includes('sunrise') ? 'sunset' : 'night'
}

export function getAstronomyOpportunityScore(event: ProximityEvent): number {
  const azimuthScore = clamp(100 - (event.azimuthDiff / 30) * 100)
  const timingScore = clamp(100 - (event.timeDiffMinutes / 30) * 100)
  return Math.round(azimuthScore * 0.6 + timingScore * 0.4)
}

export function getCombinedOpportunityScore(astronomyScore: number, weatherScore: number): number {
  return Math.round(astronomyScore * 0.5 + weatherScore * 0.5)
}

function getDailyCandidates(hourly: HourlyForecast[]): Array<{ profile: WeatherProfile; weather: HourlyForecast }> {
  const candidates: Array<{ profile: WeatherProfile; weather: HourlyForecast }> = []

  for (const point of hourly) {
    const hour = point.time.getHours()
    if (hour >= 16 && hour <= 22) {
      candidates.push({ profile: 'sunset', weather: point })
      continue
    }

    if (hour <= 4 || hour >= 22) {
      candidates.push({ profile: 'night', weather: point })
    }
  }

  return candidates
}

export function buildDailyPhotoScores(forecast: WeatherForecast): DailyPhotoScore[] {
  const byDay = new Map<string, HourlyForecast[]>()

  for (const point of forecast.hourly) {
    const key = format(point.time, 'yyyy-MM-dd')
    const existing = byDay.get(key)
    if (existing) {
      existing.push(point)
      continue
    }
    byDay.set(key, [point])
  }

  const results: DailyPhotoScore[] = []

  for (const points of byDay.values()) {
    if (points.length === 0) continue
    const dayCandidates = getDailyCandidates(points)
    const fallback = dayCandidates.length > 0 ? dayCandidates : [{ profile: 'sunset' as const, weather: points[0] }]

    let best: ScoredConditions | null = null
    let bestWeather: HourlyForecast | null = null

    for (const candidate of fallback) {
      const scored = scoreWeatherConditions(candidate.profile, candidate.weather)
      if (!best || scored.score > best.score) {
        best = scored
        bestWeather = candidate.weather
      }
    }

    if (!best || !bestWeather) continue

    results.push({
      date: points[0].time,
      profile: best.profile,
      score: best.score,
      icon: best.icon,
      label: best.label,
      summary: best.summary,
      observationTime: bestWeather.time,
      conditions: {
        windSpeed: bestWeather.wind_speed_10m,
        cloudCover: bestWeather.cloud_cover,
        humidity: bestWeather.relative_humidity_2m,
      },
    })
  }

  return results.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 7)
}

export function isGoodWeather(score: number): boolean {
  return score >= GOOD_WEATHER_SCORE
}
