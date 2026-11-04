import { useEffect, useMemo, useState } from 'react'
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
import { getPolarLabel, getSunTimes } from '@/lib/astronomy/sun-calculator'
import { findProximityEvents } from '@/lib/astronomy/proximity-finder'
import { findFullMoons } from '@/lib/astronomy/full-moon-finder'
import { getNextMeteorShower } from '@/lib/astronomy/meteor-calculator'
import { getComets } from '@/lib/astronomy/comet-calculator'
import { getWeatherProfileForProximityEvent } from '@/lib/weather/scoring'
import { differenceInMinutes } from 'date-fns'
import { formatTime, formatTimeRange, formatDateShort } from '@/lib/formatting'
import { localDayDifference, localTimeOnDay } from '@/lib/time/zone'

export function HomePage() {
  const { selectedDate, selectedDayStart, timeZone, isToday, goToPreviousDay, goToNextDay, goToToday, goToDate } = useSelectedDate()
  const { nextEvent, countdown } = useNextEvent()
  const latitude = useLocationStore((s) => s.latitude)
  const longitude = useLocationStore((s) => s.longitude)
  const { timeFormat } = useSettingsStore()
  const dailyScores = useWeatherStore((state) => state.dailyScores)
  const forecast = useWeatherStore((state) => state.forecast)
  const fetchForecast = useWeatherStore((state) => state.fetchForecast)
  const getScoreForTime = useWeatherStore((state) => state.getScoreForTime)

  // Countdown for sun events within 2 hours
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const isSameLocalDay = (date: Date) => localDayDifference(date, now, timeZone) === 0

  const moonData = useMemo(
    () => getMoonData(selectedDate, latitude, longitude, timeZone),
    [selectedDate, latitude, longitude, timeZone],
  )
  const sunTimes = useMemo(
    () => getSunTimes(selectedDate, latitude, longitude, timeZone),
    [selectedDate, latitude, longitude, timeZone],
  )
  const polarLabel = getPolarLabel(sunTimes.polar)
  const proximityEvents = useMemo(
    () => findProximityEvents(selectedDayStart, 90, latitude, longitude, timeZone),
    [selectedDayStart, latitude, longitude, timeZone],
  )
  // Skip opportunities earlier today that have already passed.
  const nextProximity = useMemo(
    () => proximityEvents.find((event) => !isToday || event.sunTime.getTime() > now.getTime()) ?? null,
    [proximityEvents, isToday, now],
  )
  const nextFullMoon = useMemo(
    () => findFullMoons(selectedDayStart, 2, timeZone)[0] ?? null,
    [selectedDayStart, timeZone],
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
    () => getNextMeteorShower(selectedDayStart, latitude),
    [selectedDayStart, latitude],
  )

  const activeComets = useMemo(
    () => getComets(latitude).filter((c) => c.isActive || c.isUpcoming),
    [latitude],
  )

  const nextFullMoonWeather = useMemo(() => {
    if (!nextFullMoon || !forecast) return null
    return getScoreForTime(localTimeOnDay(nextFullMoon.date, timeZone, 22), 'night')
  }, [getScoreForTime, nextFullMoon, forecast, timeZone])

  const nextProximityWeather = useMemo(() => {
    if (!nextProximity || !forecast) return null
    const profile = getWeatherProfileForProximityEvent(nextProximity)
    return getScoreForTime(nextProximity.sunTime, profile, nextProximity.moonIllumination)
  }, [getScoreForTime, nextProximity, forecast])

  const upcomingEvents = useMemo(() => {
    const events: { type: string; date: Date; key: string }[] = []
    if (nextFullMoon) events.push({ type: 'fullmoon', date: new Date(nextFullMoon.date), key: 'fullmoon' })
    if (nextProximity) events.push({ type: 'proximity', date: nextProximity.sunTime, key: 'proximity' })
    if (nextMeteorShower) events.push({ type: 'meteor', date: nextMeteorShower.peakDate, key: 'meteor' })
    const comet = activeComets[0]
    if (comet) events.push({ type: 'comet', date: comet.isActive ? new Date(0) : comet.peakDateParsed, key: comet.id })
    return events.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [nextFullMoon, nextProximity, nextMeteorShower, activeComets])

  const sunCountdowns = useMemo(() => {
    if (!isToday) return { sunrise: null, sunset: null, goldenHour: null }
    const events = [
      { key: 'sunrise' as const, time: sunTimes.sunrise },
      { key: 'sunset' as const, time: sunTimes.sunset },
      { key: 'goldenHour' as const, time: sunTimes.goldenHourStart },
    ] as const
    const result: Record<string, string | null> = { sunrise: null, sunset: null, goldenHour: null }
    for (const { key, time } of events) {
      if (!time) continue
      const diff = differenceInMinutes(time, now)
      if (diff > 0 && diff <= 120) {
        if (diff >= 60) {
          const h = Math.floor(diff / 60)
          const m = diff % 60
          result[key] = m > 0 ? `in ${h}h ${m}m` : `in ${h}h`
        } else {
          result[key] = `in ${diff}m`
        }
      }
    }
    return result
  }, [isToday, sunTimes, now])

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

      {/* Sun */}
      <Link to="/sun" className="animate-in-2 block">
        <div className="surface-sun transition-all duration-300 hover:border-[rgba(212,163,115,0.15)]">
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
              value={
                <span className="flex items-center gap-2">
                  {sunCountdowns.sunrise && (
                    <span className="text-xs font-normal text-amber-400/70">{sunCountdowns.sunrise}</span>
                  )}
                  <span>{formatTime(sunTimes.sunrise, timeFormat, timeZone)}</span>
                </span>
              }
              icon={<Sun className="h-3.5 w-3.5 text-amber-400/80" />}
            />
            <InfoRow
              label="Sunset"
              value={
                <span className="flex items-center gap-2">
                  {sunCountdowns.sunset && (
                    <span className="text-xs font-normal text-orange-400/70">{sunCountdowns.sunset}</span>
                  )}
                  <span>{formatTime(sunTimes.sunset, timeFormat, timeZone)}</span>
                </span>
              }
              icon={<Sun className="h-3.5 w-3.5 text-orange-400/80" />}
            />
            <InfoRow
              label="Golden Hour"
              value={
                <span className="flex items-center gap-2">
                  {sunCountdowns.goldenHour && (
                    <span className="text-xs font-normal text-yellow-400/70">{sunCountdowns.goldenHour}</span>
                  )}
                  <span>{formatTimeRange(sunTimes.goldenHourStart, sunTimes.goldenHourEnd, timeFormat, timeZone)}</span>
                </span>
              }
              icon={<Camera className="h-3.5 w-3.5 text-yellow-400/70" />}
            />
            {polarLabel && (
              <p className="pt-1 text-xs text-muted-foreground">{polarLabel}</p>
            )}
          </div>
        </div>
      </Link>

      {/* Moon */}
      <Link to="/moon" className="animate-in-3 block">
        <div className="surface-moon transition-all duration-300 hover:border-[rgba(168,184,216,0.15)]">
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
            <MoonPhaseIcon phase={moonData.phase} tiltAngle={moonData.tiltAngle} size={56} />
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
              value={formatTime(moonData.moonrise, timeFormat, timeZone)}
              icon={<Moon className="h-3.5 w-3.5 text-moon/60" />}
            />
            <InfoRow
              label="Moonset"
              value={formatTime(moonData.moonset, timeFormat, timeZone)}
              icon={<Moon className="h-3.5 w-3.5 text-muted-foreground/40" />}
            />
            {nextFullMoon && (
              <InfoRow
                label="Next Full Moon"
                value={`${formatDateShort(nextFullMoon.date, timeZone)} · ${nextFullMoon.folkName}`}
                icon={<Calendar className="h-3.5 w-3.5 text-moon/40" />}
              />
            )}
          </div>
        </div>
      </Link>

      {/* Best days */}
      <Link to="/weather" className="animate-in-4 block">
        <div className="surface transition-all duration-300 hover:border-white/8">
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

          <div className="divide-y divide-white/4 overflow-hidden rounded-xl border border-white/4">
            {bestDays.map((day) => {
              const dayIsToday = isSameLocalDay(day.date)
              return (
                <div
                  key={day.date.toISOString()}
                  className={`flex items-center gap-3 px-4 py-3 ${dayIsToday ? 'bg-sky-400/8 border-l-2 border-l-sky-400/60' : ''}`}
                >
                  <p className={`w-16 shrink-0 text-sm font-medium ${dayIsToday ? 'text-sky-300' : 'text-foreground/80'}`}>
                    {dayIsToday ? 'Today' : formatDateShort(day.date, timeZone)}
                  </p>
                  <p className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground line-clamp-2">{day.summary}</p>
                  <span className="shrink-0 rounded-lg border border-white/8 bg-white/4 px-2.5 py-1 text-xs font-semibold tabular-nums">
                    {day.icon} {day.label} {day.score}/100
                  </span>
                </div>
              )
            })}

            {bestDays.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                No good or excellent days in this forecast
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Upcoming */}
      <div className="animate-in-5">
        <div className="surface space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/6">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Upcoming</span>
          </div>

          <div className="divide-y divide-white/4 overflow-hidden rounded-xl border border-white/4">
            {upcomingEvents.map((event) => {
              if (event.type === 'fullmoon' && nextFullMoon) {
                const today = isSameLocalDay(nextFullMoon.date)
                return (
                  <div key={event.key} className={`flex items-center gap-3 px-4 py-3 ${today ? 'bg-sky-400/8 border-l-2 border-l-sky-400/60' : ''}`}>
                    <p className={`w-16 shrink-0 text-sm font-medium ${today ? 'text-sky-300' : 'text-foreground/80'}`}>
                      {today ? 'Today' : formatDateShort(nextFullMoon.date, timeZone)}
                    </p>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-moon/8">
                      <Moon className="h-4 w-4 text-moon" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{nextFullMoon.folkName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Full Moon{nextFullMoon.isSupermoon && <span className="text-moon"> · Supermoon</span>}
                      </p>
                    </div>
                    <WeatherBadge score={nextFullMoonWeather} />
                  </div>
                )
              }
              if (event.type === 'proximity' && nextProximity) {
                const today = isSameLocalDay(nextProximity.sunTime)
                return (
                  <div key={event.key} className={`flex items-center gap-3 px-4 py-3 ${today ? 'bg-sky-400/8 border-l-2 border-l-sky-400/60' : ''}`}>
                    <p className={`w-16 shrink-0 text-sm font-medium ${today ? 'text-sky-300' : 'text-foreground/80'}`}>
                      {today ? 'Today' : formatDateShort(nextProximity.sunTime, timeZone)}
                    </p>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-proximity/8">
                      <Camera className="h-4 w-4 text-proximity" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">Photo Opportunity</p>
                      <p className="text-xs leading-snug text-muted-foreground line-clamp-2">{nextProximity.description}</p>
                    </div>
                    <WeatherBadge score={nextProximityWeather} />
                    <span className="shrink-0 rounded-lg border border-white/8 bg-white/4 px-2.5 py-1 text-xs font-semibold tabular-nums text-proximity">
                      {formatTime(nextProximity.moonTime, timeFormat, timeZone)}
                    </span>
                  </div>
                )
              }
              if (event.type === 'meteor' && nextMeteorShower) {
                const today = isSameLocalDay(nextMeteorShower.peakDate)
                return (
                  <div key={event.key} className={`flex items-center gap-3 px-4 py-3 ${today ? 'bg-sky-400/8 border-l-2 border-l-sky-400/60' : ''}`}>
                    <p className={`w-16 shrink-0 text-sm font-medium ${today ? 'text-sky-300' : 'text-foreground/80'}`}>
                      {today ? 'Today' : formatDateShort(nextMeteorShower.peakDate, timeZone)}
                    </p>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-400/10">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{nextMeteorShower.name}</p>
                      <p className="truncate text-xs text-muted-foreground">Meteor Shower · ZHR {nextMeteorShower.zhr}</p>
                    </div>
                    {nextMeteorShower.zhr >= 100 && (
                      <span className="rounded-lg border border-white/8 bg-indigo-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                        Major
                      </span>
                    )}
                  </div>
                )
              }
              if (event.type === 'comet') {
                const comet = activeComets[0]
                if (!comet) return null
                const today = !comet.isActive && isSameLocalDay(comet.peakDateParsed)
                return (
                  <div key={event.key} className={`flex items-center gap-3 px-4 py-3 ${today ? 'bg-sky-400/8 border-l-2 border-l-sky-400/60' : ''}`}>
                    <p className={`w-16 shrink-0 text-sm font-medium ${today ? 'text-sky-300' : 'text-foreground/80'}`}>
                      {today ? 'Today' : comet.isActive ? 'Now' : formatDateShort(comet.peakDateParsed, timeZone)}
                    </p>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10">
                      <Orbit className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{comet.name}</p>
                      <p className="truncate text-xs text-muted-foreground">Comet · Mag {comet.magnitude}</p>
                    </div>
                    {comet.magnitude <= 2 && (
                      <span className="rounded-lg border border-white/8 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-400">
                        Naked Eye
                      </span>
                    )}
                  </div>
                )
              }
              return null
            })}

            {!nextFullMoon && !nextProximity && !nextMeteorShower && activeComets.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                No upcoming events
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
