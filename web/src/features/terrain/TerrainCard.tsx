import { useMemo } from 'react'
import { Mountain } from 'lucide-react'
import { InfoRow } from '@/components/shared/InfoRow'
import { formatDuration, formatTime } from '@/lib/formatting'
import { terrainLight, useHorizon } from '@/lib/terrain/horizon'
import { useSettingsStore } from '@/stores/settings-store'
import type { SunTimes } from '@/types'

interface TerrainCardProps {
  latitude: number
  longitude: number
  /** Local midnight of the selected day. */
  dayStart: Date
  sunTimes: SunTimes
  timeZone: string
}

function minutesBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60_000)
}

function relative(minutes: number, after: string, before: string): string {
  if (minutes === 0) return `at ${after.split(' ').pop()}`
  return minutes > 0 ? `${minutes} min ${after}` : `${-minutes} min ${before}`
}

/** Real first/last light over the terrain skyline for the Sun and Moon. */
export function TerrainCard({ latitude, longitude, dayStart, sunTimes, timeZone }: TerrainCardProps) {
  const { timeFormat } = useSettingsStore()
  const { horizon, loading } = useHorizon(latitude, longitude)

  const light = useMemo(() => {
    if (!horizon) return null
    return {
      sun: terrainLight(horizon, 'sun', dayStart),
      moon: terrainLight(horizon, 'moon', dayStart),
    }
  }, [horizon, dayStart])

  const time = (date: Date | null) => formatTime(date, timeFormat, timeZone)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sun/8">
          <Mountain className="h-3.5 w-3.5 text-sun" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Real Horizon</span>
      </div>
      <div className="surface space-y-0">
        {loading || !light || !horizon ? (
          <p className="py-3 text-sm text-muted-foreground" role="status">
            Reading terrain around this spot…
          </p>
        ) : (
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
            <InfoRow label="Moon clears terrain" value={time(light.moon.firstLight)} />
            <InfoRow label="Moon drops behind terrain" value={time(light.moon.lastLight)} />
            <p className="pt-2 text-xs text-muted-foreground">
              Ground {Math.round(horizon.elevation)} m · hills and coast from open elevation data; trees and
              buildings are not included.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
