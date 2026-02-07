import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun, Camera, Calendar, ChevronRight } from 'lucide-react'
import { MoonPhaseIcon } from '@/components/shared/MoonPhaseIcon'
import { InfoRow } from '@/components/shared/InfoRow'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { useLocationStore } from '@/stores/location-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useCurrentTime } from '@/hooks/useCurrentTime'
import { getMoonData } from '@/lib/astronomy/moon-calculator'
import { getSunTimes } from '@/lib/astronomy/sun-calculator'
import { findProximityEvents } from '@/lib/astronomy/proximity-finder'
import { findFullMoons } from '@/lib/astronomy/full-moon-finder'
import { formatTime, formatDate, formatDateShort } from '@/lib/formatting'

export function HomePage() {
  const now = useCurrentTime()
  const { latitude, longitude } = useLocationStore()
  const { timeFormat } = useSettingsStore()

  const moonData = useMemo(() => getMoonData(now, latitude, longitude), [now, latitude, longitude])
  const sunTimes = useMemo(() => getSunTimes(now, latitude, longitude), [now, latitude, longitude])
  const nextProximity = useMemo(
    () => findProximityEvents(now, 90, latitude, longitude)[0] ?? null,
    [now, latitude, longitude],
  )
  const nextFullMoon = useMemo(
    () => findFullMoons(now, 2)[0] ?? null,
    [now],
  )

  return (
    <div className="space-y-6">
      <div className="animate-in-1">
        <SectionHeader
          title="Dashboard"
          description={formatDate(now)}
        />
      </div>

      {/* Sun */}
      <Link to="/sun" className="animate-in-2 block">
        <div className="surface-sun p-5 transition-all duration-300 hover:border-[rgba(212,163,115,0.15)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sun/8">
                <Sun className="h-4 w-4 text-sun" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight">Sun</span>
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
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-moon/8">
                <Moon className="h-4 w-4 text-moon" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight">Moon</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
          </div>

          <div className="flex items-center gap-5 pb-2">
            <MoonPhaseIcon phase={moonData.phase} size={56} />
            <div>
              <p className="text-[16px] font-semibold tracking-tight">{moonData.phaseName}</p>
              <p className="mt-0.5 text-[13px] tabular-nums text-muted-foreground">
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

      {/* Upcoming */}
      <div className="animate-in-4 space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Upcoming
        </h3>

        {nextFullMoon && (
          <div className="surface flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moon/8">
              <Moon className="h-5 w-5 text-moon" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium">{nextFullMoon.folkName}</p>
              <p className="text-[12px] text-muted-foreground">
                {formatDate(nextFullMoon.date)}
              </p>
            </div>
            {nextFullMoon.isSupermoon && (
              <span className="rounded-lg bg-moon/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-moon">
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
              <p className="text-[14px] font-medium">Photo Opportunity</p>
              <p className="text-[12px] text-muted-foreground">
                {formatDateShort(nextProximity.date)} · {nextProximity.description}
              </p>
            </div>
            <span className="rounded-lg bg-proximity/8 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-proximity">
              {formatTime(nextProximity.moonTime, timeFormat)}
            </span>
          </div>
        )}

        {!nextFullMoon && !nextProximity && (
          <div className="surface py-10 text-center">
            <p className="text-[13px] text-muted-foreground/40">No upcoming events</p>
          </div>
        )}
      </div>
    </div>
  )
}
