import { useEffect, useMemo } from 'react'
import { Moon } from 'lucide-react'
import { WeatherBadge } from '@/features/weather/WeatherBadge'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/formatting'
import { useLocationStore } from '@/stores/location-store'
import { useWeatherStore } from '@/stores/weather-store'
import { formatRelativeDays, localTimeOnDay } from '@/lib/time/zone'
import type { FullMoonEvent } from '@/types'

interface MoonFullMoonsTabProps {
  fullMoons: FullMoonEvent[]
  now: Date
  timeZone: string
}

export function MoonFullMoonsTab({ fullMoons, now, timeZone }: MoonFullMoonsTabProps) {
  const { latitude, longitude } = useLocationStore()
  const fetchForecast = useWeatherStore((state) => state.fetchForecast)
  const getScoreForTime = useWeatherStore((state) => state.getScoreForTime)
  const forecast = useWeatherStore((state) => state.forecast)

  useEffect(() => {
    void fetchForecast(latitude, longitude)
  }, [fetchForecast, latitude, longitude])

  const weatherScoresByDate = useMemo(() => {
    const scores = new Map<string, ReturnType<typeof getScoreForTime>>()
    if (!forecast) return scores
    for (const fullMoon of fullMoons) {
      const eventTime = localTimeOnDay(fullMoon.date, timeZone, 22)
      scores.set(fullMoon.date.toISOString(), getScoreForTime(eventTime, 'night'))
    }
    return scores
  }, [fullMoons, getScoreForTime, forecast, timeZone])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-moon/8">
          <Moon className="h-3.5 w-3.5 text-moon" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Full Moons</span>
      </div>

      {fullMoons.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No full moons found in range
        </p>
      ) : (
        <div className="surface divide-y divide-white/[0.04]">
      {fullMoons.map((fm) => (
        <div key={fm.date.toISOString()} className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-base">🌕</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-semibold tracking-tight text-foreground">{fm.folkName}</p>
              {fm.isSupermoon && (
                <Badge className="shrink-0 border-0 bg-moon/10 px-1.5 py-0 text-xs font-medium text-moon">
                  Super
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{formatDate(fm.date, timeZone)}</p>
          </div>
          <WeatherBadge score={weatherScoresByDate.get(fm.date.toISOString()) ?? null} />
          <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-xs tabular-nums text-muted-foreground">
            {formatRelativeDays(fm.date, now, timeZone)}
          </span>
        </div>
      ))}
        </div>
      )}
    </div>
  )
}
