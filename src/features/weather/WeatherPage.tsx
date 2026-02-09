import { useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { Cloud, CloudSun, Droplets, RefreshCw, Wind } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { formatDate, formatTime } from '@/lib/formatting'
import { cn } from '@/lib/utils'
import { useLocationStore } from '@/stores/location-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useWeatherStore } from '@/stores/weather-store'

function getRatingClass(label: string): string {
  if (label === 'Excellent') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200'
  if (label === 'Good') return 'border-sky-300/25 bg-sky-300/10 text-sky-200'
  if (label === 'Fair') return 'border-amber-300/25 bg-amber-300/10 text-amber-200'
  return 'border-zinc-300/20 bg-zinc-300/8 text-zinc-200'
}

function getCardClass(label: string): string {
  if (label === 'Excellent') {
    return 'surface border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30 shadow-[0_0_30px_-10px_rgba(16,185,129,0.1)]'
  }
  if (label === 'Good') {
    return 'surface border-sky-500/20 bg-sky-500/5 hover:border-sky-500/30 shadow-[0_0_30px_-10px_rgba(14,165,233,0.1)]'
  }
  return 'surface'
}

interface IconMetricProps {
  label: string
  displayValue: string
  icon: typeof Wind
}

function IconMetric({ label, displayValue, icon: Icon }: IconMetricProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2.5 text-center">
      <div className="flex justify-center">
        <Icon className="h-5 w-5 text-foreground/75" />
      </div>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-foreground/55">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground/90">
        {displayValue}
      </p>
    </div>
  )
}

function IconMetricsBlock({
  windSpeed,
  cloudCover,
  humidity,
}: {
  windSpeed: number
  cloudCover: number
  humidity: number
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <IconMetric label="Wind" displayValue={`${Math.round(windSpeed)} km/h`} icon={Wind} />
      <IconMetric label="Clouds" displayValue={`${Math.round(cloudCover)}%`} icon={Cloud} />
      <IconMetric label="Humidity" displayValue={`${Math.round(humidity)}%`} icon={Droplets} />
    </div>
  )
}

export function WeatherPage() {
  const { latitude, longitude } = useLocationStore()
  const { timeFormat } = useSettingsStore()
  const dailyScores = useWeatherStore((state) => state.dailyScores)
  const isLoading = useWeatherStore((state) => state.isLoading)
  const error = useWeatherStore((state) => state.error)
  const lastUpdated = useWeatherStore((state) => state.lastUpdated)
  const fetchForecast = useWeatherStore((state) => state.fetchForecast)
  const getScoreForTime = useWeatherStore((state) => state.getScoreForTime)

  const trendsByDay = useMemo(() => {
    const trends = new Map<string, { label: string; className: string }>()

    for (const day of dailyScores) {
      const nextTime = new Date(day.observationTime.getTime() + 24 * 60 * 60 * 1000)
      const nextScore = getScoreForTime(nextTime, day.profile)
      if (!nextScore) continue

      const delta = nextScore.score - day.score
      const key = day.date.toISOString()

      if (delta >= 10) {
        trends.set(key, { label: `↗ improving (+${delta})`, className: 'text-emerald-300/90' })
        continue
      }

      if (delta <= -10) {
        trends.set(key, { label: `↘ getting worse (${delta})`, className: 'text-amber-200/90' })
        continue
      }

      trends.set(key, { label: '→ steady (24h)', className: 'text-foreground/55' })
    }

    return trends
  }, [dailyScores, getScoreForTime])

  useEffect(() => {
    void fetchForecast(latitude, longitude)
  }, [fetchForecast, latitude, longitude])

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Weather"
        description="7-day photo forecast"
        icon={<CloudSun className="h-4 w-4" />}
        action={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-full border border-white/[0.08] px-3 text-xs"
            onClick={() => void fetchForecast(latitude, longitude, true)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="surface p-4 text-sm text-destructive">{error}</div>
      )}

      <div className="space-y-4">
        {dailyScores.map((day) => {
          const trend = trendsByDay.get(day.date.toISOString())

          return (
            <div
              key={day.date.toISOString()}
              className={cn(getCardClass(day.label))}
            >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_17rem] md:items-start md:gap-5">
              <div className="min-w-0 space-y-3">
                <p className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                  {formatDate(day.date)}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-foreground/80">
                    Best {formatTime(day.observationTime, timeFormat)}
                  </span>
                  <span className="rounded-full border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-foreground/70">
                    {day.profile === 'sunset' ? 'Sunset profile' : 'Night profile'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <p className="text-sm leading-relaxed text-foreground/85">
                    {day.summary}
                  </p>
                  <p className="text-xs text-foreground/60">
                    {day.profile === 'sunset'
                      ? 'Scored for color potential: high clouds + low/mid cloud clearance + stable wind.'
                      : 'Scored for night shooting: clear sky + low wind + humidity + moon darkness.'}
                  </p>
                </div>
              </div>

              <aside className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold ${getRatingClass(day.label)}`}>
                    <span>{day.icon}</span>
                    <span>{day.label}</span>
                  </span>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] tabular-nums text-foreground/80">
                    {day.score}/100
                  </p>
                </div>
                {trend && (
                  <p className={cn('text-xs font-medium', trend.className)}>
                    {trend.label}
                  </p>
                )}
                <IconMetricsBlock
                  windSpeed={day.conditions.windSpeed}
                  cloudCover={day.conditions.cloudCover}
                  humidity={day.conditions.humidity}
                />
              </aside>
            </div>
            </div>
          )
        })}

        {!isLoading && dailyScores.length === 0 && (
          <div className="surface px-4 py-10 text-center text-sm text-muted-foreground/70">
            Forecast unavailable for this location.
          </div>
        )}

        {isLoading && dailyScores.length === 0 && (
          <div className="surface px-4 py-10 text-center text-sm text-muted-foreground/70">
            Loading forecast...
          </div>
        )}
      </div>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground/70">
          Updated {format(new Date(lastUpdated), 'MMM d, HH:mm')}
        </p>
      )}
    </div>
  )
}
