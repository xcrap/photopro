import SunCalc from 'suncalc'
import type { HourlyForecast, WeatherForecast } from '@/lib/weather/api'
import type { ProximityEvent } from '@/types'
import { TZDate } from '@date-fns/tz'
import { getSunPosition, getSunTimes } from '@/lib/astronomy/sun-calculator'
import {
  addLocalDays,
  getDeviceTimeZone,
  isValidTimeZone,
  localDayKey,
  localMidnight,
  localTimeOnDay,
} from '@/lib/time/zone'

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

/** Moon illumination (%) at a given instant. */
export function getMoonIlluminationPercent(time: Date): number {
  return SunCalc.getMoonIllumination(time).fraction * 100
}

function scoreNightConditions(weather: HourlyForecast, moonIllumination?: number): Score {
  const windScore = scoreWind(weather.wind_speed_10m, { ideal: 8, max: 12 })
  const clearSkyScore = 100 - weather.cloud_cover
  const humidityScore = scoreHumidity(weather.relative_humidity_2m)
  // The night profile always includes the moon: compute it for the scored hour if not given.
  const illumination = moonIllumination ?? getMoonIlluminationPercent(weather.time)
  const moonScore = Math.round(clamp(100 - illumination))

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

const MINUTE_MS = 60_000
const SUNSET_WINDOW_BEFORE_MS = 90 * MINUTE_MS
const SUNSET_WINDOW_AFTER_MS = 60 * MINUTE_MS
/** Civil twilight: the Sun at −6°. */
const CIVIL_TWILIGHT_ALTITUDE_DEG = -6

interface DailyCandidate {
  profile: WeatherProfile
  weather: HourlyForecast
}

function pointsBetween(hourly: HourlyForecast[], startMs: number, endMs: number, inclusiveEnd: boolean) {
  return hourly.filter((point) => {
    const t = point.time.getTime()
    return t >= startMs && (inclusiveEnd ? t <= endMs : t < endMs)
  })
}

/**
 * Candidate hours for local date `day` from its real sun times
 * (ALGORITHM.md → "Daily photo score"):
 * - sunset profile: sunset − 90 min … sunset + 60 min
 * - night profile: civil dusk today … civil dawn tomorrow (hours after midnight count as tonight)
 */
function getDailyCandidates(
  hourly: HourlyForecast[],
  day: Date,
  latitude: number,
  longitude: number,
  timeZone: string,
): DailyCandidate[] {
  const candidates: DailyCandidate[] = []
  const today = getSunTimes(day, latitude, longitude, timeZone)
  const nextDay = addLocalDays(day, 1, timeZone)
  const tomorrow = getSunTimes(nextDay, latitude, longitude, timeZone)

  if (today.sunset) {
    const sunsetMs = today.sunset.getTime()
    for (const weather of pointsBetween(hourly, sunsetMs - SUNSET_WINDOW_BEFORE_MS, sunsetMs + SUNSET_WINDOW_AFTER_MS, true)) {
      candidates.push({ profile: 'sunset', weather })
    }
  }

  let nightStart = today.dusk
  if (!nightStart) {
    // No civil dusk: deep polar night (always dark) or a white night (never dark).
    const noon = today.solarNoon ?? localTimeOnDay(day, timeZone, 12)
    const alwaysDark = getSunPosition(noon, latitude, longitude).altitude < CIVIL_TWILIGHT_ALTITUDE_DEG
    nightStart = alwaysDark ? localTimeOnDay(day, timeZone, 18) : null
  }
  if (nightStart) {
    const nightEnd = tomorrow.dawn ?? localTimeOnDay(nextDay, timeZone, 6)
    for (const weather of pointsBetween(hourly, nightStart.getTime(), nightEnd.getTime(), false)) {
      candidates.push({ profile: 'night', weather })
    }
  }

  return candidates
}

/** Start of the current hour in the location's zone (handles :30/:45 offsets). */
function startOfCurrentLocalHour(now: Date, timeZone: string): number {
  const local = new TZDate(now.getTime(), timeZone)
  local.setMinutes(0, 0, 0)
  return local.getTime()
}

export function buildDailyPhotoScores(forecast: WeatherForecast, now: Date = new Date()): DailyPhotoScore[] {
  // The forecast's own `timezone` is the location's zone (timezone=auto).
  const timeZone = isValidTimeZone(forecast.timezone) ? forecast.timezone : getDeviceTimeZone()
  const hourly = [...forecast.hourly].sort((a, b) => a.time.getTime() - b.time.getTime())
  if (hourly.length === 0) return []

  const notBefore = startOfCurrentLocalHour(now, timeZone)
  const dayStarts = new Map<string, Date>()
  for (const point of hourly) {
    const key = localDayKey(point.time, timeZone)
    if (!dayStarts.has(key)) dayStarts.set(key, localMidnight(point.time, timeZone))
  }

  // Hours before dawn on the first date belong to the previous evening's night ("tonight").
  const firstDay = dayStarts.values().next().value as Date
  const days = [localMidnight(addLocalDays(firstDay, -1, timeZone), timeZone), ...dayStarts.values()]

  const results: DailyPhotoScore[] = []

  for (const dayStart of days) {
    const candidates = getDailyCandidates(hourly, dayStart, forecast.latitude, forecast.longitude, timeZone)
      .filter((candidate) => candidate.weather.time.getTime() >= notBefore)

    let best: ScoredConditions | null = null
    let bestWeather: HourlyForecast | null = null

    for (const candidate of candidates) {
      const scored = scoreWeatherConditions(candidate.profile, candidate.weather)
      if (!best || scored.score > best.score) {
        best = scored
        bestWeather = candidate.weather
      }
    }

    if (!best || !bestWeather) continue

    results.push({
      date: dayStart,
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
