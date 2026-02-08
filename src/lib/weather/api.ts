import { addDays, format } from 'date-fns'

export interface HourlyForecast {
  time: Date
  wind_speed_10m: number
  cloud_cover: number
  cloud_cover_low: number
  cloud_cover_mid: number
  cloud_cover_high: number
  relative_humidity_2m: number
}

export interface WeatherForecast {
  latitude: number
  longitude: number
  timezone: string
  hourly: HourlyForecast[]
  fetchedAt: number
}

interface OpenMeteoHourlyResponse {
  time: string[]
  wind_speed_10m: number[]
  cloud_cover: number[]
  cloud_cover_low: number[]
  cloud_cover_mid: number[]
  cloud_cover_high: number[]
  relative_humidity_2m: number[]
}

interface OpenMeteoResponse {
  latitude: number
  longitude: number
  timezone: string
  hourly: OpenMeteoHourlyResponse
}

const HOURLY_PARAMS = [
  'wind_speed_10m',
  'cloud_cover',
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'relative_humidity_2m',
].join(',')

function toDate(value: string): Date {
  return new Date(value)
}

function toHourlyForecast(hourly: OpenMeteoHourlyResponse): HourlyForecast[] {
  const length = hourly.time.length
  const points: HourlyForecast[] = []

  for (let i = 0; i < length; i++) {
    points.push({
      time: toDate(hourly.time[i]),
      wind_speed_10m: hourly.wind_speed_10m[i] ?? 0,
      cloud_cover: hourly.cloud_cover[i] ?? 0,
      cloud_cover_low: hourly.cloud_cover_low[i] ?? 0,
      cloud_cover_mid: hourly.cloud_cover_mid[i] ?? 0,
      cloud_cover_high: hourly.cloud_cover_high[i] ?? 0,
      relative_humidity_2m: hourly.relative_humidity_2m[i] ?? 0,
    })
  }

  return points
}

export async function fetchWeatherForecast(
  latitude: number,
  longitude: number,
  days = 7,
): Promise<WeatherForecast> {
  const startDate = new Date()
  const endDate = addDays(startDate, Math.max(1, days) - 1)

  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: HOURLY_PARAMS,
    timezone: 'auto',
    start_date: format(startDate, 'yyyy-MM-dd'),
    end_date: format(endDate, 'yyyy-MM-dd'),
  })

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Weather request failed (${response.status})`)
  }

  const data = (await response.json()) as OpenMeteoResponse
  if (!data.hourly?.time?.length) {
    throw new Error('Weather forecast is unavailable')
  }

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
    hourly: toHourlyForecast(data.hourly),
    fetchedAt: Date.now(),
  }
}
