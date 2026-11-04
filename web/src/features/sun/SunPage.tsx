import { useEffect, useMemo, useState } from 'react'
import {
  Sun,
  Sunrise,
  Sunset,
  Camera,
  Clock,
  Eclipse,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { InfoRow } from '@/components/shared/InfoRow'
import { DateNavigator } from '@/components/shared/DateNavigator'
import { WeatherBadge } from '@/features/weather/WeatherBadge'
import { useLocationStore } from '@/stores/location-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useSelectedDate } from '@/hooks/useSelectedDate'
import { getPolarLabel, getSunTimes } from '@/lib/astronomy/sun-calculator'
import { getUpcomingEclipses, getVisibilityForLocation } from '@/lib/astronomy/eclipse-calculator'
import {
  formatTime,
  formatTimeRange,
  formatDate,
} from '@/lib/formatting'
import solarEclipsesData from '@/data/solar-eclipses.json'
import type { EclipseEvent } from '@/types'

export function SunPage() {
  const { selectedDate, timeZone, isToday, goToPreviousDay, goToNextDay, goToToday, goToDate } = useSelectedDate()
  const latitude = useLocationStore((s) => s.latitude)
  const longitude = useLocationStore((s) => s.longitude)
  const { timeFormat, eclipseYearsRange } = useSettingsStore()
  const [visibleOnly, setVisibleOnly] = useState(true)
  const fetchForecast = useWeatherStore((state) => state.fetchForecast)
  const getScoreForTime = useWeatherStore((state) => state.getScoreForTime)
  const forecast = useWeatherStore((state) => state.forecast)

  const sunTimes = useMemo(
    () => getSunTimes(selectedDate, latitude, longitude, timeZone),
    [selectedDate, latitude, longitude, timeZone],
  )
  const polarLabel = getPolarLabel(sunTimes.polar)

  const eclipses = useMemo(() => {
    const data = solarEclipsesData.map((e) => ({
      ...e,
      date: new Date(e.date),
      category: 'solar' as const,
    })) as EclipseEvent[]
    return getUpcomingEclipses(data, [], eclipseYearsRange)
  }, [eclipseYearsRange])

  const eclipsesWithVisibility = useMemo(
    () => eclipses.map((eclipse) => ({
      eclipse,
      visibility: getVisibilityForLocation(eclipse, latitude, longitude),
    })),
    [eclipses, latitude, longitude],
  )

  const filteredEclipses = useMemo(
    () => (visibleOnly
      ? eclipsesWithVisibility.filter((item) => item.visibility > 0)
      : eclipsesWithVisibility),
    [visibleOnly, eclipsesWithVisibility],
  )
  const filteredEclipsesWithWeather = useMemo(
    () =>
      filteredEclipses.map((item) => ({
        ...item,
        // Solar eclipses happen in daylight: score clear sky/wind at the peak instant.
        weatherScore: forecast ? getScoreForTime(item.eclipse.date, 'night', 0) : null,
      })),
    [filteredEclipses, getScoreForTime, forecast],
  )

  useEffect(() => {
    void fetchForecast(latitude, longitude)
  }, [fetchForecast, latitude, longitude])

  const typeColors: Record<string, string> = {
    total: 'text-red-300',
    partial: 'text-amber-200',
    annular: 'text-orange-200',
  }

  return (
    <div className="space-y-5">
      <div className="animate-in-1">
        <SectionHeader
          title="Sun"
          description="Times, position & solar eclipses"
          action={
            <DateNavigator
              date={selectedDate}
              timeZone={timeZone}
              isToday={isToday}
              onPrevious={goToPreviousDay}
              onNext={goToNextDay}
              onToday={goToToday}
              onDateSelect={goToDate}
            />
          }
        />
      </div>

      <Tabs defaultValue="current" className="animate-in-2 space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
          <TabsTrigger value="current" className="rounded-full border border-transparent px-3.5 py-1.5 text-sm data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]">
            Current
          </TabsTrigger>
          <TabsTrigger value="eclipses" className="rounded-full border border-transparent px-3.5 py-1.5 text-sm data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]">
            Eclipses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-5">
          {/* Sun Times */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sun/8">
                <Clock className="h-3.5 w-3.5 text-sun" />
              </div>
              <span className="text-sm font-semibold tracking-tight">{isToday ? "Today's" : 'Day'} Times</span>
            </div>
            <div className="surface space-y-0">
                <InfoRow
                  label="Sunrise"
                  value={formatTime(sunTimes.sunrise, timeFormat, timeZone)}
                  icon={<Sunrise className="h-3.5 w-3.5 text-amber-400" />}
                />
                <InfoRow
                  label="Solar Noon"
                  value={formatTime(sunTimes.solarNoon, timeFormat, timeZone)}
                  icon={<Sun className="h-3.5 w-3.5 text-yellow-300" />}
                />
                <InfoRow
                  label="Sunset"
                  value={formatTime(sunTimes.sunset, timeFormat, timeZone)}
                  icon={<Sunset className="h-3.5 w-3.5 text-orange-400" />}
                />
                {polarLabel && (
                  <p className="pt-1 text-xs text-muted-foreground">{polarLabel}</p>
                )}
            </div>
          </div>

          {/* Photography Times */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sun/8">
                <Camera className="h-3.5 w-3.5 text-sun" />
              </div>
              <span className="text-sm font-semibold tracking-tight">Photography Hours</span>
            </div>
            <div className="surface space-y-0">
                <InfoRow
                  label="Blue Hour (AM)"
                  sublabel="Cool tones, soft light"
                  value={formatTimeRange(sunTimes.blueHourMorningStart, sunTimes.blueHourMorningEnd, timeFormat, timeZone)}
                  icon={<span className="text-[10px] text-blue-400">●</span>}
                />
                <InfoRow
                  label="Golden Hour (AM)"
                  sublabel="Warm, directional light"
                  value={formatTimeRange(sunTimes.goldenHourMorningStart, sunTimes.goldenHourMorningEnd, timeFormat, timeZone)}
                  icon={<span className="text-[10px] text-amber-400">●</span>}
                />
                <InfoRow
                  label="Golden Hour (PM)"
                  sublabel="Warm, directional light"
                  value={formatTimeRange(sunTimes.goldenHourStart, sunTimes.goldenHourEnd, timeFormat, timeZone)}
                  icon={<span className="text-[10px] text-orange-400">●</span>}
                />
                <InfoRow
                  label="Blue Hour (PM)"
                  sublabel="Cool tones, soft light"
                  value={formatTimeRange(sunTimes.blueHourEveningStart, sunTimes.blueHourEveningEnd, timeFormat, timeZone)}
                  icon={<span className="text-[10px] text-blue-400">●</span>}
                />
            </div>
          </div>

          {/* Twilight */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sun/8">
                <Sunset className="h-3.5 w-3.5 text-sun" />
              </div>
              <span className="text-sm font-semibold tracking-tight">Twilight</span>
            </div>
            <div className="surface space-y-0">
                <InfoRow label="Dawn" value={formatTime(sunTimes.dawn, timeFormat, timeZone)} />
                <InfoRow label="Dusk" value={formatTime(sunTimes.dusk, timeFormat, timeZone)} />
                <InfoRow label="Nautical Dawn" value={formatTime(sunTimes.nauticalDawn, timeFormat, timeZone)} />
                <InfoRow label="Nautical Dusk" value={formatTime(sunTimes.nauticalDusk, timeFormat, timeZone)} />
                <InfoRow label="Night Start" value={formatTime(sunTimes.nightStart, timeFormat, timeZone)} />
                <InfoRow label="Night End" value={formatTime(sunTimes.nightEnd, timeFormat, timeZone)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="eclipses">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-eclipse/8">
                  <Eclipse className="h-3.5 w-3.5 text-eclipse" />
                </div>
                <span className="text-sm font-semibold tracking-tight">Solar Eclipses</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground/80">
                  {visibleOnly ? 'Visible only' : 'All'}
                </span>
                <Switch checked={visibleOnly} onCheckedChange={setVisibleOnly} />
              </div>
            </div>

            {filteredEclipses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {visibleOnly
                  ? 'No visible solar eclipses for your location in this range'
                  : `No solar eclipses in the next ${eclipseYearsRange} year${eclipseYearsRange > 1 ? 's' : ''}`}
              </p>
            ) : (
              filteredEclipsesWithWeather.map(({ eclipse, visibility, weatherScore }) => (
                <div
                  key={eclipse.date.toISOString()}
                  className="surface-eclipse"
                >
                    {/* Header */}
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-base font-semibold tracking-tight text-foreground">
                        {formatDate(eclipse.date, timeZone)}
                      </h3>
                      <div className="flex items-center gap-2">
                        <WeatherBadge score={weatherScore} />
                        <span className={`text-xs font-semibold uppercase tracking-wider ${typeColors[eclipse.type] || 'text-foreground/60'}`}>
                          {eclipse.type}
                        </span>
                      </div>
                    </div>

                    <p className="mt-1 text-sm text-foreground/60">
                      <span className="capitalize">{eclipse.type}</span> Solar Eclipse · Peak {formatTime(eclipse.date, timeFormat, timeZone)}
                    </p>

                    <p className="mt-2 text-sm leading-relaxed text-foreground/50">{eclipse.description}</p>

                    {/* Visibility */}
                    <div className="mt-3.5 flex items-center gap-4">
                      <div className="flex-1">
                        <Progress value={visibility} className="h-1.5 bg-white/[0.06] [&_[data-slot=progress-indicator]]:bg-eclipse" />
                      </div>
                      <span className="text-lg font-bold tabular-nums text-foreground">
                        {visibility > 0 ? `${visibility}%` : '—'}
                      </span>
                    </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
