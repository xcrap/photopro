import { useMemo } from 'react'
import { differenceInDays } from 'date-fns'
import { Calendar, Compass, Ruler, Clock } from 'lucide-react'
import { MoonPhaseIcon } from '@/components/shared/MoonPhaseIcon'
import { InfoRow } from '@/components/shared/InfoRow'
import { useSettingsStore } from '@/stores/settings-store'
import { findFullMoons } from '@/lib/astronomy/full-moon-finder'
import { formatTime, formatDegrees, formatDistance, formatAzimuthDirection, formatDateShort } from '@/lib/formatting'
import type { MoonData } from '@/types'

interface MoonCurrentTabProps {
  moonData: MoonData
  now: Date
}

export function MoonCurrentTab({ moonData, now }: MoonCurrentTabProps) {
  const { timeFormat } = useSettingsStore()
  const nextFullMoon = useMemo(() => findFullMoons(now, 2)[0] ?? null, [now])

  return (
    <div className="space-y-5">
      {/* Phase hero */}
      <div className="flex flex-col items-center gap-5 px-6 py-8">
        <MoonPhaseIcon phase={moonData.phase} size={140} />
        <div className="text-center">
          <h3 className="text-xl font-bold tracking-tight">{moonData.phaseName}</h3>
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
            {moonData.illumination.toFixed(1)}% illuminated
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="surface p-5">
        <InfoRow
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Moon Age"
          value={`${moonData.age.toFixed(1)} days`}
        />
        <InfoRow
          icon={<Ruler className="h-3.5 w-3.5" />}
          label="Distance"
          value={formatDistance(moonData.distance)}
        />
        <InfoRow
          icon={<Compass className="h-3.5 w-3.5" />}
          label="Altitude"
          value={formatDegrees(moonData.altitude)}
        />
        <InfoRow
          icon={<Compass className="h-3.5 w-3.5" />}
          label="Azimuth"
          value={`${formatDegrees(moonData.azimuth)} ${formatAzimuthDirection(moonData.azimuth)}`}
        />
        {nextFullMoon && (
          <InfoRow
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Next Full Moon"
            value={`${formatDateShort(nextFullMoon.date)} · ${nextFullMoon.folkName} · in ${differenceInDays(nextFullMoon.date, now)}d`}
          />
        )}
      </div>

      {/* Rise/Set */}
      <div className="surface p-5">
        <InfoRow
          label="Moonrise"
          value={moonData.moonrise ? formatTime(moonData.moonrise, timeFormat) : '—'}
          icon={<span className="text-xs">🌙↑</span>}
        />
        <InfoRow
          label="Moonset"
          value={moonData.moonset ? formatTime(moonData.moonset, timeFormat) : '—'}
          icon={<span className="text-xs">🌙↓</span>}
        />
      </div>
    </div>
  )
}
