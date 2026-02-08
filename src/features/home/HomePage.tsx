import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun, Camera, Calendar, ChevronRight, CloudSun, Sparkles, Orbit } from 'lucide-react'
import { MoonPhaseIcon } from '@/components/shared/MoonPhaseIcon'
import { InfoRow } from '@/components/shared/InfoRow'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { DateNavigator } from '@/components/shared/DateNavigator'
import { WeatherBadge } from '@/features/weather/WeatherBadge'
import { useLocationStore } from '@/stores/location-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useSelectedDate } from '@/hooks/useSelectedDate'
import { useNextEvent } from '@/hooks/useNextEvent'
import { getMoonData } from '@/lib/astronomy/moon-calculator'
import { getSunTimes } from '@/lib/astronomy/sun-calculator'
import { findProximityEvents } from '@/lib/astronomy/proximity-finder'
import { findFullMoons } from '@/lib/astronomy/full-moon-finder'
import { getNextMeteorShower } from '@/lib/astronomy/meteor-calculator'
import { getComets } from '@/lib/astronomy/comet-calculator'
import { getWeatherProfileForProximityEvent } from '@/lib/weather/scoring'
import { formatTime, formatDateShort } from '@/lib/formatting'

export function HomePage() {
  const { selectedDate, isToday, goToPreviousDay, goToNextDay, goToToday, goToDate } = useSelectedDate()
  const { nextEvent, countdown } = useNextEvent()
  const { latitude, longitude } = useLocationStore()
  const { timeFormat } = useSettingsStore()
  const dailyScores = useWeatherStore((state) => state.dailyScores)
  const fetchForecast = useWeatherStore((state) => state.fetchForecast)
  const getScoreForTime = useWeatherStore((state) => state.getScoreForTime)

  const moonData = useMemo(() => getMoonData(selectedDate, latitude, longitude), [selectedDate, latitude, longitude])
  const sunTimes = useMemo(() => getSunTimes(selectedDate, latitude, longitude), [selectedDate, latitude, longitude])
  const nextProximity = useMemo(
    () => findProximityEvents(selectedDate, 90, latitude, longitude)[0] ?? null,
    [selectedDate, latitude, longitude],
  )
  const nextFullMoon = useMemo(
    () => findFullMoons(selectedDate, 2)[0] ?? null,
    [selectedDate],
  )
  const bestDays = useMemo(
    () =>
      [...dailyScores]
        .filter((day) => day.score >= 70)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    [dailyScores],
  )

  const nextMeteorShower = useMemo(
    () => getNextMeteorShower(selectedDate, latitude),
    [selectedDate, latitude],
  )

  const activeComets = useMemo(
    () => getComets(latitude).filter((c) => c.isActive || c.isUpcoming),
    [latitude],
  )

  const nextFullMoonWeather = useMemo(() => {
    if (!nextFullMoon) return null
    const eventTime = new Date(nextFullMoon.date)
    eventTime.setHours(22, 0, 0, 0)
    return getScoreForTime(eventTime, 'night')
  }, [getScoreForTime, nextFullMoon])

  const nextProximityWeather = useMemo(() => {
    if (!nextProximity) return null
    const profile = getWeatherProfileForProximityEvent(nextProximity)
    return getScoreForTime(nextProximity.sunTime, profile, nextProximity.moonIllumination)
  }, [getScoreForTime, nextProximity])

  useEffect(() => {
    void fetchForecast(latitude, longitude)
  }, [fetchForecast, latitude, longitude])

  return (
    <div className="space-y-6">
      <div className="animate-in-1">
        <SectionHeader
          title="Dashboard"
          description="Overview & upcoming events"
          action={
            <DateNavigator
              date={selectedDate}
              isToday={isToday}
              onPrevious={goToPreviousDay}
              onNext={goToNextDay}
              onToday={goToToday}
              onDateSelect={goToDate}
            />
          }
        />
      </div>

      {/* Sun */}
      <Link to="/sun" className="animate-in-2 block">
        <div className="surface-sun p-5 transition-all duration-300 hover:border-[rgba(212,163,115,0.15)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sun/8">
                <Sun className="h-3.5 w-3.5 text-sun" />
              </div>
              <span className="text-sm font-semibold tracking-tight">Sun</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
          </div>
          <div className="space-y-0">
            <InfoRow
              label="Sunrise"
              value={formatTime(sunTimes.sunrise, timeFormat)}
              icon={<Sun className="h-3.5 w-3.5 text-amber-400/80" />}
            />
            <InfoRow
              label="Sunset"
              value={formatTime(sunTimes.sunset, timeFormat)}
              icon={<Sun className="h-3.5 w-3.5 text-orange-400/80" />}
            />
            <InfoRow
              label="Golden Hour"
              value={`${formatTime(sunTimes.goldenHourStart, timeFormat)} – ${formatTime(sunTimes.sunset, timeFormat)}`}
              icon={<Camera className="h-3.5 w-3.5 text-yellow-400/70" />}
            />
          </div>
        </div>
      </Link>

      {/* Moon */}
      <Link to="/moon" className="animate-in-3 block">
        <div className="surface-moon p-5 transition-all duration-300 hover:border-[rgba(168,184,216,0.15)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-moon/8">
                <Moon className="h-3.5 w-3.5 text-moon" />
              </div>
              <span className="text-sm font-semibold tracking-tight">Moon</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
          </div>

          <div className="flex items-center gap-5 pb-2">
            <MoonPhaseIcon phase={moonData.phase} size={56} />
            <div>
              <p className="text-base font-semibold tracking-tight">{moonData.phaseName}</p>
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {moonData.illumination.toFixed(0)}% illuminated
              </p>
            </div>
          </div>

          <div className="mt-1 space-y-0">
            <InfoRow
              label="Moonrise"
              value={moonData.moonrise ? formatTime(moonData.moonrise, timeFormat) : '—'}
              icon={<Moon className="h-3.5 w-3.5 text-moon/60" />}
            />
            <InfoRow
              label="Moonset"
              value={moonData.moonset ? formatTime(moonData.moonset, timeFormat) : '—'}
              icon={<Moon className="h-3.5 w-3.5 text-muted-foreground/40" />}
            />
            {nextFullMoon && (
              <InfoRow
                label="Next Full Moon"
                value={`${formatDateShort(nextFullMoon.date)} · ${nextFullMoon.folkName}`}
                icon={<Calendar className="h-3.5 w-3.5 text-moon/40" />}
              />
            )}
          </div>
        </div>
      </Link>

      {/* Best days */}
      <Link to="/weather" className="animate-in-4 block">
        <div className="surface p-5 transition-all duration-300 hover:border-white/[0.08]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-300/10">
                <CloudSun className="h-3.5 w-3.5 text-sky-300" />
              </div>
              <span className="text-sm font-semibold tracking-tight">This Week</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
          </div>

          {nextEvent && countdown && (
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{'\u23F1\uFE0F'}</span>
              <span>
                {nextEvent.label} in <span className="font-semibold text-foreground">{countdown}</span>
              </span>
            </div>
          )}

          <div className="divide-y divide-white/[0.04] overflow-hidden rounded-xl border border-white/[0.04]">
            {bestDays.map((day) => (
              <div key={day.date.toISOString()} className="flex items-center gap-3 px-4 py-3">
                <p className="w-16 shrink-0 text-sm font-medium text-foreground/80">{formatDateShort(day.date)}</p>
                <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{day.summary}</p>
                <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-semibold tabular-nums">
                  {day.icon} {day.label} {day.score}/100
                </span>
              </div>
            ))}

            {bestDays.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                No good or excellent days in this forecast
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Upcoming */}
      <div className="animate-in-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06]">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Upcoming</span>
        </div>

        {nextFullMoon && (
          <div className="surface flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moon/8">
              <Moon className="h-5 w-5 text-moon" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{nextFullMoon.folkName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateShort(nextFullMoon.date)}
              </p>
            </div>
            <WeatherBadge score={nextFullMoonWeather} />
            {nextFullMoon.isSupermoon && (
              <span className="rounded-lg bg-moon/8 px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-moon">
                Super
              </span>
            )}
          </div>
        )}

        {nextProximity && (
          <div className="surface-proximity flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-proximity/8">
              <Camera className="h-5 w-5 text-proximity" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Photo Opportunity</p>
              <p className="text-xs text-muted-foreground">
                {formatDateShort(nextProximity.date)} · {nextProximity.description}
              </p>
            </div>
            <WeatherBadge score={nextProximityWeather} />
            <span className="rounded-lg bg-proximity/8 px-2.5 py-1 text-xs font-semibold tabular-nums text-proximity">
              {formatTime(nextProximity.moonTime, timeFormat)}
            </span>
          </div>
        )}

        {nextMeteorShower && (
          <div className="surface flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-400/10">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{nextMeteorShower.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateShort(nextMeteorShower.peakDate)} · ZHR {nextMeteorShower.zhr}
              </p>
            </div>
            {nextMeteorShower.zhr >= 100 && (
              <span className="rounded-lg bg-indigo-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                Major
              </span>
            )}
          </div>
        )}

        {activeComets.slice(0, 1).map((comet) => (
          <div key={comet.id} className="surface-comet flex items-center gap-4 border-cyan-400/10 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
              <Orbit className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{comet.name}</p>
              <p className="text-xs text-muted-foreground">
                {comet.isActive ? 'Visible now' : formatDateShort(comet.peakDateParsed)} · Mag {comet.magnitude}
              </p>
            </div>
            {comet.magnitude <= 2 && (
              <span className="rounded-lg bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-400">
                Naked Eye
              </span>
            )}
          </div>
        ))}

        {!nextFullMoon && !nextProximity && !nextMeteorShower && activeComets.length === 0 && (
          <div className="surface py-10 text-center">
            <p className="text-xs text-muted-foreground/40">No upcoming events</p>
          </div>
        )}
      </div>
    </div>
  )
}
