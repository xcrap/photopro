import { useMemo } from 'react'
import { Mountain } from 'lucide-react'
import { InfoRow } from '@/components/shared/InfoRow'
import { formatDuration, formatTime } from '@/lib/formatting'
import { terrainLight, useHorizon } from '@/lib/terrain/horizon'
import type { HorizonResult } from '@/lib/terrain/terrain'
import { useSettingsStore } from '@/stores/settings-store'
import type { SunTimes } from '@/types'

export type TerrainBody = 'sun' | 'moon'

interface TerrainRowsProps {
  /** From `useHorizon` (call it once per page; each call runs the terrain worker). */
  horizon: HorizonResult | null
  loading: boolean
  /** Local midnight of the selected day. */
  dayStart: Date
  sunTimes: SunTimes
  timeZone: string
  /** Which bodies' rows to show. */
  bodies?: TerrainBody[]
}

function minutesBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60_000)
}

function relative(minutes: number, after: string, before: string): string {
  if (minutes === 0) return `at ${after.split(' ').pop()}`
  return minutes > 0 ? `${minutes} min ${after}` : `${-minutes} min ${before}`
}

/** Real first/last light over the terrain skyline for the Sun and/or Moon. */
export function TerrainRows({ horizon, loading, dayStart, sunTimes, timeZone, bodies = ['sun', 'moon'] }: TerrainRowsProps) {
  const { timeFormat } = useSettingsStore()

  const light = useMemo(() => {
    if (!horizon) return null
    return {
      sun: terrainLight(horizon, 'sun', dayStart),
      moon: terrainLight(horizon, 'moon', dayStart),
    }
  }, [horizon, dayStart])

  const time = (date: Date | null) => formatTime(date, timeFormat, timeZone)

  if (loading || !light || !horizon) {
    return (
      <p className="py-2 text-sm text-muted-foreground" role="status">
        Reading terrain around this spot…
      </p>
    )
  }

  return (
    <>
      {bodies.includes('sun') && (
        <>
          <InfoRow
            label="First direct sun"
            sublabel={
              light.sun.firstLight && sunTimes.sunrise
                ? relative(minutesBetween(light.sun.firstLight, sunTimes.sunrise), 'after sunrise', 'before sunrise')
                : undefined
            }
            value={time(light.sun.firstLight)}
          />
          <InfoRow
            label="Last direct sun"
            sublabel={
              light.sun.lastLight && sunTimes.sunset
                ? relative(minutesBetween(sunTimes.sunset, light.sun.lastLight), 'before sunset', 'after sunset')
                : undefined
            }
            value={time(light.sun.lastLight)}
          />
          <InfoRow label="Direct sun" value={light.sun.minutes > 0 ? formatDuration(light.sun.minutes) : 'None'} />
        </>
      )}
      {bodies.includes('moon') && (
        <>
          <InfoRow label="Moon clears terrain" value={time(light.moon.firstLight)} />
          <InfoRow label="Moon drops behind terrain" value={time(light.moon.lastLight)} />
        </>
      )}
    </>
  )
}

interface TerrainCardProps {
  latitude: number
  longitude: number
  /** Local midnight of the selected day. */
  dayStart: Date
  sunTimes: SunTimes
  timeZone: string
}

/** "Real Horizon" card for the Sun page: when direct sunlight actually reaches the spot. */
export function TerrainCard({ latitude, longitude, ...rest }: TerrainCardProps) {
  const { horizon, loading } = useHorizon(latitude, longitude)
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sun/8">
          <Mountain className="h-3.5 w-3.5 text-sun" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Real Horizon</span>
      </div>
      <div className="surface space-y-0">
        <TerrainRows horizon={horizon} loading={loading} {...rest} bodies={['sun']} />
        <p className="pt-2 text-xs text-muted-foreground">
          {horizon ? `Ground ${Math.round(horizon.elevation)} m · ` : ''}hills and coast from open elevation data;
          trees and buildings are not included.
        </p>
      </div>
    </div>
  )
}
