import { useMemo } from 'react'
import {
  Sun,
  Sunrise,
  Sunset,
  Camera,
  Compass,
  Clock,
  Eclipse,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { InfoRow } from '@/components/shared/InfoRow'
import { useLocationStore } from '@/stores/location-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useCurrentTime } from '@/hooks/useCurrentTime'
import { getSunTimes, getSunPosition } from '@/lib/astronomy/sun-calculator'
import { getUpcomingEclipses, getVisibilityForLocation } from '@/lib/astronomy/eclipse-calculator'
import {
  formatTime,
  formatDegrees,
  formatAzimuthDirection,
  formatDate,
} from '@/lib/formatting'
import solarEclipsesData from '@/data/solar-eclipses.json'
import type { EclipseEvent } from '@/types'

export function SunPage() {
  const now = useCurrentTime()
  const { latitude, longitude } = useLocationStore()
  const { timeFormat, eclipseYearsRange } = useSettingsStore()

  const sunTimes = useMemo(() => getSunTimes(now, latitude, longitude), [now, latitude, longitude])
  const sunPos = useMemo(() => getSunPosition(now, latitude, longitude), [now, latitude, longitude])

  const eclipses = useMemo(() => {
    const data = solarEclipsesData.map((e) => ({
      ...e,
      date: new Date(e.date),
      category: 'solar' as const,
    })) as EclipseEvent[]
    return getUpcomingEclipses(data, [], eclipseYearsRange)
  }, [eclipseYearsRange])

  const typeBadgeColors: Record<string, string> = {
    total: 'bg-red-500/10 text-red-400',
    partial: 'bg-amber-500/10 text-amber-400',
    annular: 'bg-orange-500/10 text-orange-400',
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Sun"
        description="Times, position & solar eclipses"
        icon={<Sun className="h-4 w-4" />}
      />

      {/* Current Position */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Compass className="h-4 w-4 text-sun" />
            Current Position
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 pt-0">
          <InfoRow
            label="Altitude"
            value={formatDegrees(sunPos.altitude)}
            icon={<Sun className="h-3.5 w-3.5 text-sun" />}
          />
          <Separator className="opacity-30" />
          <InfoRow
            label="Azimuth"
            value={`${formatDegrees(sunPos.azimuth)} ${formatAzimuthDirection(sunPos.azimuth)}`}
            icon={<Compass className="h-3.5 w-3.5 text-sun" />}
          />
          <Separator className="opacity-30" />
          <InfoRow
            label="Status"
            value={
              <Badge variant="outline" className={sunPos.altitude > 0 ? 'border-sun/30 text-sun' : ''}>
                {sunPos.altitude > 0 ? 'Above Horizon' : 'Below Horizon'}
              </Badge>
            }
            icon={<Clock className="h-3.5 w-3.5" />}
          />
        </CardContent>
      </Card>

      {/* Sun Times */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-sun" />
            Today&apos;s Times
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 pt-0">
          <InfoRow
            label="Sunrise"
            value={formatTime(sunTimes.sunrise, timeFormat)}
            icon={<Sunrise className="h-3.5 w-3.5 text-amber-400" />}
          />
          <Separator className="opacity-30" />
          <InfoRow
            label="Solar Noon"
            value={formatTime(sunTimes.solarNoon, timeFormat)}
            icon={<Sun className="h-3.5 w-3.5 text-yellow-300" />}
          />
          <Separator className="opacity-30" />
          <InfoRow
            label="Sunset"
            value={formatTime(sunTimes.sunset, timeFormat)}
            icon={<Sunset className="h-3.5 w-3.5 text-orange-400" />}
          />
        </CardContent>
      </Card>

      {/* Photography Times */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Camera className="h-4 w-4 text-sun" />
            Photography Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 pt-0">
          <InfoRow
            label="Blue Hour (AM)"
            sublabel="Cool tones, soft light"
            value={`${formatTime(sunTimes.blueHourMorningStart, timeFormat)} - ${formatTime(sunTimes.blueHourMorningEnd, timeFormat)}`}
            icon={<span className="text-xs text-blue-400">●</span>}
          />
          <Separator className="opacity-30" />
          <InfoRow
            label="Golden Hour (AM)"
            sublabel="Warm, directional light"
            value={`${formatTime(sunTimes.goldenHourMorningStart, timeFormat)} - ${formatTime(sunTimes.goldenHourMorningEnd, timeFormat)}`}
            icon={<span className="text-xs text-amber-400">●</span>}
          />
          <Separator className="opacity-30" />
          <InfoRow
            label="Golden Hour (PM)"
            sublabel="Warm, directional light"
            value={`${formatTime(sunTimes.goldenHourStart, timeFormat)} - ${formatTime(sunTimes.goldenHourEnd, timeFormat)}`}
            icon={<span className="text-xs text-orange-400">●</span>}
          />
          <Separator className="opacity-30" />
          <InfoRow
            label="Blue Hour (PM)"
            sublabel="Cool tones, soft light"
            value={`${formatTime(sunTimes.blueHourEveningStart, timeFormat)} - ${formatTime(sunTimes.blueHourEveningEnd, timeFormat)}`}
            icon={<span className="text-xs text-blue-400">●</span>}
          />
        </CardContent>
      </Card>

      {/* Twilight */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Sunset className="h-4 w-4" />
            Twilight
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 pt-0">
          <InfoRow label="Dawn" value={formatTime(sunTimes.dawn, timeFormat)} />
          <Separator className="opacity-30" />
          <InfoRow label="Dusk" value={formatTime(sunTimes.dusk, timeFormat)} />
          <Separator className="opacity-30" />
          <InfoRow label="Nautical Dawn" value={formatTime(sunTimes.nauticalDawn, timeFormat)} />
          <Separator className="opacity-30" />
          <InfoRow label="Nautical Dusk" value={formatTime(sunTimes.nauticalDusk, timeFormat)} />
          <Separator className="opacity-30" />
          <InfoRow label="Night Start" value={formatTime(sunTimes.nightStart, timeFormat)} />
          <Separator className="opacity-30" />
          <InfoRow label="Night End" value={formatTime(sunTimes.nightEnd, timeFormat)} />
        </CardContent>
      </Card>

      {/* Solar Eclipses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Eclipse className="h-4 w-4 text-eclipse" />
            Solar Eclipses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {eclipses.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No solar eclipses in the next {eclipseYearsRange} year{eclipseYearsRange > 1 ? 's' : ''}
            </p>
          ) : (
            eclipses.map((eclipse, i) => {
              const visibility = getVisibilityForLocation(eclipse, latitude, longitude)
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border/50 p-3"
                  style={{ borderLeftWidth: 3, borderLeftColor: 'var(--eclipse)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold capitalize">
                        {eclipse.type} Solar Eclipse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(eclipse.date)} &middot; Peak: {eclipse.peakTime}
                      </p>
                    </div>
                    <Badge className={typeBadgeColors[eclipse.type] || ''}>
                      {eclipse.type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{eclipse.description}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Visibility</span>
                      <span className="font-medium">
                        {visibility > 0 ? `${visibility}%` : 'Not visible'}
                      </span>
                    </div>
                    <Progress value={visibility} className="h-1.5" />
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
