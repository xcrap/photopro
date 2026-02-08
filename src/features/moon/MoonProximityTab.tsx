import { useEffect, useMemo, useState } from 'react'
import { Camera } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { WeatherBadge } from '@/features/weather/WeatherBadge'
import { formatDate, formatTime } from '@/lib/formatting'
import {
  getAstronomyOpportunityScore,
  getCombinedOpportunityScore,
  getWeatherProfileForProximityEvent,
  isGoodWeather,
} from '@/lib/weather/scoring'
import { useLocationStore } from '@/stores/location-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useWeatherStore } from '@/stores/weather-store'
import type { ProximityEvent } from '@/types'

interface MoonProximityTabProps {
  events: ProximityEvent[]
}

const typeLabels: Record<ProximityEvent['type'], string> = {
  'moonrise-sunrise': 'Moonrise + Sunrise',
  'moonrise-sunset': 'Moonrise + Sunset',
  'moonset-sunrise': 'Moonset + Sunrise',
  'moonset-sunset': 'Moonset + Sunset',
}

const typeTimeLabels: Record<ProximityEvent['type'], { moon: 'Moonrise' | 'Moonset'; sun: 'Sunrise' | 'Sunset' }> = {
  'moonrise-sunrise': { moon: 'Moonrise', sun: 'Sunrise' },
  'moonrise-sunset': { moon: 'Moonrise', sun: 'Sunset' },
  'moonset-sunrise': { moon: 'Moonset', sun: 'Sunrise' },
  'moonset-sunset': { moon: 'Moonset', sun: 'Sunset' },
}

function getTimingRelation(event: ProximityEvent): string {
  const labels = typeTimeLabels[event.type]
  const moonBeforeSun = event.moonTime.getTime() <= event.sunTime.getTime()
  const minutes = Math.round(event.timeDiffMinutes)
  return `${labels.moon} ${minutes}min ${moonBeforeSun ? 'before' : 'after'} ${labels.sun}`
}

function getQualityLabel(event: ProximityEvent): { text: string; className: string } {
  if (event.azimuthDiff <= 5 && event.timeDiffMinutes <= 10) {
    return { text: 'Excellent', className: 'text-emerald-400' }
  }
  if (event.azimuthDiff <= 10 && event.timeDiffMinutes <= 20) {
    return { text: 'Good', className: 'text-proximity' }
  }
  return { text: 'Fair', className: 'text-muted-foreground' }
}

export function MoonProximityTab({ events }: MoonProximityTabProps) {
  const { latitude, longitude } = useLocationStore()
  const { timeFormat } = useSettingsStore()
  const [showGoodWeatherOnly, setShowGoodWeatherOnly] = useState(false)
  const fetchForecast = useWeatherStore((state) => state.fetchForecast)
  const getScoreForTime = useWeatherStore((state) => state.getScoreForTime)

  useEffect(() => {
    void fetchForecast(latitude, longitude)
  }, [fetchForecast, latitude, longitude])

  const rankedEvents = useMemo(() => {
    const scored = events.map((event) => {
      const profile = getWeatherProfileForProximityEvent(event)
      const weatherScore = getScoreForTime(event.sunTime, profile, event.moonIllumination)
      const astronomyScore = getAstronomyOpportunityScore(event)
      const combinedScore = weatherScore
        ? getCombinedOpportunityScore(astronomyScore, weatherScore.score)
        : astronomyScore

      return {
        event,
        weatherScore,
        combinedScore,
      }
    })

    const filtered = showGoodWeatherOnly
      ? scored.filter((item) => item.weatherScore && isGoodWeather(item.weatherScore.score))
      : scored

    return filtered.sort((a, b) => {
      const dateDiff = a.event.date.getTime() - b.event.date.getTime()
      if (dateDiff !== 0) return dateDiff
      return b.combinedScore - a.combinedScore
    })
  }, [events, getScoreForTime, showGoodWeatherOnly])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-proximity/8">
            <Camera className="h-3.5 w-3.5 text-proximity" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Photo Opportunities</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground/80">Good weather only</span>
          <Switch checked={showGoodWeatherOnly} onCheckedChange={setShowGoodWeatherOnly} />
        </div>
      </div>

      {rankedEvents.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground/60">
          {showGoodWeatherOnly ? 'No good-weather opportunities in range' : 'No opportunities found in the next year'}
        </p>
      ) : (
        rankedEvents.map(({ event, weatherScore, combinedScore }, i) => {
          const quality = getQualityLabel(event)
          const labels = typeTimeLabels[event.type]

          return (
            <div
              key={i}
              className="surface-proximity p-5"
            >
                {/* Header: Date + Type */}
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    {formatDate(event.date)}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-proximity/20 bg-proximity/8 px-2 py-0.5 text-xs font-semibold tabular-nums text-proximity">
                      Combined {combinedScore}
                    </span>
                    <span className={`text-sm font-medium ${quality.className}`}>
                      {typeLabels[event.type]}
                    </span>
                  </div>
                </div>

                {/* Times row */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/[0.04] px-3 py-2.5">
                    <p className="text-xs text-muted-foreground/70">{labels.moon}</p>
                    <p className="text-lg font-semibold tabular-nums text-foreground">{formatTime(event.moonTime, timeFormat)}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.04] px-3 py-2.5">
                    <p className="text-xs text-muted-foreground/70">{labels.sun}</p>
                    <p className="text-lg font-semibold tabular-nums text-foreground">{formatTime(event.sunTime, timeFormat)}</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-3 flex items-center gap-3 text-sm tabular-nums text-foreground/70">
                  <span>{event.azimuthDiff.toFixed(1)}° apart</span>
                  <span className="text-white/10">|</span>
                  <span>{Math.round(event.timeDiffMinutes)} min gap</span>
                  <span className="text-white/10">|</span>
                  <span>{event.moonIllumination.toFixed(0)}% lit</span>
                </div>

                {/* Context line */}
                <p className="mt-2.5 text-sm text-muted-foreground/60">
                  {getTimingRelation(event)}
                  <span className="mx-1.5 text-white/10">·</span>
                  <span className={quality.className}>{quality.text}</span>
                </p>
                <div className="mt-3">
                  <WeatherBadge score={weatherScore} />
                </div>
            </div>
          )
        })
      )}
    </div>
  )
}
