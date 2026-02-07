import { useMemo } from 'react'
import { differenceInDays } from 'date-fns'
import { Calendar, Compass, Ruler, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
    <div className="space-y-4">
      {/* Phase display */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <MoonPhaseIcon phase={moonData.phase} size={96} />
            <div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl">{moonData.emoji}</span>
                <h3 className="text-xl font-bold">{moonData.phaseName}</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {moonData.illumination.toFixed(1)}% illuminated
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardContent className="space-y-0 pt-6">
          <InfoRow
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Moon Age"
            value={`${moonData.age.toFixed(1)} days`}
          />
          <Separator className="opacity-30" />
          <InfoRow
            icon={<Ruler className="h-3.5 w-3.5" />}
            label="Distance"
            value={formatDistance(moonData.distance)}
          />
          <Separator className="opacity-30" />
          <InfoRow
            icon={<Compass className="h-3.5 w-3.5" />}
            label="Altitude"
            value={formatDegrees(moonData.altitude)}
          />
          <Separator className="opacity-30" />
          <InfoRow
            icon={<Compass className="h-3.5 w-3.5" />}
            label="Azimuth"
            value={`${formatDegrees(moonData.azimuth)} ${formatAzimuthDirection(moonData.azimuth)}`}
          />
          {nextFullMoon && (
            <>
              <Separator className="opacity-30" />
              <InfoRow
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Next Full Moon"
                value={`${formatDateShort(nextFullMoon.date)} · ${nextFullMoon.folkName} · in ${differenceInDays(nextFullMoon.date, now)} days`}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Rise/Set */}
      <Card>
        <CardContent className="space-y-0 pt-6">
          <InfoRow
            label="Moonrise"
            value={moonData.moonrise ? formatTime(moonData.moonrise, timeFormat) : 'N/A'}
            icon={<span className="text-xs">🌙↑</span>}
          />
          <Separator className="opacity-30" />
          <InfoRow
            label="Moonset"
            value={moonData.moonset ? formatTime(moonData.moonset, timeFormat) : 'N/A'}
            icon={<span className="text-xs">🌙↓</span>}
          />
        </CardContent>
      </Card>
    </div>
  )
}
