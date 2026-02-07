import { useMemo, useState } from 'react'
import {
  Sun,
  Sunrise,
  Sunset,
  Camera,
  Compass,
  Clock,
  Eclipse,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const [showAllEclipses, setShowAllEclipses] = useState(false)

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

  const eclipsesWithVisibility = useMemo(
    () => eclipses.map((eclipse) => ({
      eclipse,
      visibility: getVisibilityForLocation(eclipse, latitude, longitude),
    })),
    [eclipses, latitude, longitude],
  )

  const filteredEclipses = useMemo(
    () => (showAllEclipses
      ? eclipsesWithVisibility
      : eclipsesWithVisibility.filter((item) => item.visibility > 0)),
    [showAllEclipses, eclipsesWithVisibility],
  )

  const typeBadgeColors: Record<string, string> = {
    total: 'bg-red-500/10 text-red-300 border-0',
    partial: 'bg-amber-500/10 text-amber-200 border-0',
    annular: 'bg-orange-500/10 text-orange-200 border-0',
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Sun"
        description="Times, position & solar eclipses"
      />

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
          <TabsTrigger value="current" className="rounded-full border border-transparent px-3.5 py-1.5 text-[14px] data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]">
            Current
          </TabsTrigger>
          <TabsTrigger value="eclipses" className="rounded-full border border-transparent px-3.5 py-1.5 text-[14px] data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]">
            Eclipses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-5">
          {/* Current Position */}
          <Card className="surface-sun overflow-hidden border-0">
            <div className="flex items-center gap-2 px-5 pt-4 pb-2">
              <Compass className="h-4 w-4 text-sun/70" />
              <span className="text-[13px] font-semibold">Position</span>
            </div>
            <CardContent className="space-y-0 px-5 pt-0 pb-4">
              <InfoRow
                label="Altitude"
                value={formatDegrees(sunPos.altitude)}
                icon={<Sun className="h-3.5 w-3.5 text-sun" />}
              />
              <InfoRow
                label="Azimuth"
                value={`${formatDegrees(sunPos.azimuth)} ${formatAzimuthDirection(sunPos.azimuth)}`}
                icon={<Compass className="h-3.5 w-3.5 text-sun/70" />}
              />
              <InfoRow
                label="Status"
                value={
                  <Badge variant="outline" className={`text-[10px] font-normal ${sunPos.altitude > 0 ? 'border-sun/20 text-sun' : 'border-white/[0.06]'}`}>
                    {sunPos.altitude > 0 ? 'Above Horizon' : 'Below Horizon'}
                  </Badge>
                }
                icon={<Clock className="h-3.5 w-3.5" />}
              />
            </CardContent>
          </Card>

          {/* Sun Times */}
          <Card className="surface overflow-hidden border-0">
            <div className="flex items-center gap-2 px-5 pt-4 pb-2">
              <Clock className="h-4 w-4 text-sun/70" />
              <span className="text-[13px] font-semibold">Today&apos;s Times</span>
            </div>
            <CardContent className="space-y-0 px-5 pt-0 pb-4">
              <InfoRow
                label="Sunrise"
                value={formatTime(sunTimes.sunrise, timeFormat)}
                icon={<Sunrise className="h-3.5 w-3.5 text-amber-400" />}
              />
              <InfoRow
                label="Solar Noon"
                value={formatTime(sunTimes.solarNoon, timeFormat)}
                icon={<Sun className="h-3.5 w-3.5 text-yellow-300" />}
              />
              <InfoRow
                label="Sunset"
                value={formatTime(sunTimes.sunset, timeFormat)}
                icon={<Sunset className="h-3.5 w-3.5 text-orange-400" />}
              />
            </CardContent>
          </Card>

          {/* Photography Times */}
          <Card className="surface overflow-hidden border-0">
            <div className="flex items-center gap-2 px-5 pt-4 pb-2">
              <Camera className="h-4 w-4 text-sun/70" />
              <span className="text-[13px] font-semibold">Photography Hours</span>
            </div>
            <CardContent className="space-y-0 px-5 pt-0 pb-4">
              <InfoRow
                label="Blue Hour (AM)"
                sublabel="Cool tones, soft light"
                value={`${formatTime(sunTimes.blueHourMorningStart, timeFormat)} – ${formatTime(sunTimes.blueHourMorningEnd, timeFormat)}`}
                icon={<span className="text-[10px] text-blue-400">●</span>}
              />
              <InfoRow
                label="Golden Hour (AM)"
                sublabel="Warm, directional light"
                value={`${formatTime(sunTimes.goldenHourMorningStart, timeFormat)} – ${formatTime(sunTimes.goldenHourMorningEnd, timeFormat)}`}
                icon={<span className="text-[10px] text-amber-400">●</span>}
              />
              <InfoRow
                label="Golden Hour (PM)"
                sublabel="Warm, directional light"
                value={`${formatTime(sunTimes.goldenHourStart, timeFormat)} – ${formatTime(sunTimes.goldenHourEnd, timeFormat)}`}
                icon={<span className="text-[10px] text-orange-400">●</span>}
              />
              <InfoRow
                label="Blue Hour (PM)"
                sublabel="Cool tones, soft light"
                value={`${formatTime(sunTimes.blueHourEveningStart, timeFormat)} – ${formatTime(sunTimes.blueHourEveningEnd, timeFormat)}`}
                icon={<span className="text-[10px] text-blue-400">●</span>}
              />
            </CardContent>
          </Card>

          {/* Twilight */}
          <Card className="surface overflow-hidden border-0">
            <div className="flex items-center gap-2 px-5 pt-4 pb-2">
              <Sunset className="h-4 w-4 text-muted-foreground/50" />
              <span className="text-[13px] font-semibold">Twilight</span>
            </div>
            <CardContent className="space-y-0 px-5 pt-0 pb-4">
              <InfoRow label="Dawn" value={formatTime(sunTimes.dawn, timeFormat)} />
              <InfoRow label="Dusk" value={formatTime(sunTimes.dusk, timeFormat)} />
              <InfoRow label="Nautical Dawn" value={formatTime(sunTimes.nauticalDawn, timeFormat)} />
              <InfoRow label="Nautical Dusk" value={formatTime(sunTimes.nauticalDusk, timeFormat)} />
              <InfoRow label="Night Start" value={formatTime(sunTimes.nightStart, timeFormat)} />
              <InfoRow label="Night End" value={formatTime(sunTimes.nightEnd, timeFormat)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eclipses">
          {/* Solar Eclipses */}
          <Card className="surface-eclipse overflow-hidden border-0">
            <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <Eclipse className="h-4 w-4 text-eclipse/70" />
                <span className="text-[13px] font-semibold">Solar Eclipses</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground">
                  {showAllEclipses ? 'Showing all' : 'Visible only'}
                </span>
                <Switch checked={showAllEclipses} onCheckedChange={setShowAllEclipses} />
              </div>
            </div>
            <CardContent className="space-y-2 px-5 pt-0 pb-4">
              {filteredEclipses.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-muted-foreground/50">
                  {showAllEclipses
                    ? `No solar eclipses in the next ${eclipseYearsRange} year${eclipseYearsRange > 1 ? 's' : ''}`
                    : 'No visible solar eclipses for your location in this range'}
                </p>
              ) : (
                filteredEclipses.map(({ eclipse, visibility }, i) => {
                  return (
                    <div
                      key={i}
                      className="rounded-xl bg-white/[0.03] p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-[18px] leading-tight font-semibold capitalize text-foreground">
                            {eclipse.type} Solar Eclipse
                          </p>
                          <p className="text-[14px] text-muted-foreground">
                            {formatDate(eclipse.date)} · Peak: {eclipse.peakTime}
                          </p>
                        </div>
                        <Badge className={`text-[13px] capitalize ${typeBadgeColors[eclipse.type] || ''}`}>
                          {eclipse.type}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{eclipse.description}</p>
                      <div className="mt-3.5 space-y-2">
                        <div className="flex items-center justify-between text-[14px]">
                          <span className="text-muted-foreground">Visibility at your location</span>
                          <span className="font-semibold tabular-nums text-foreground">
                            {visibility > 0 ? `${visibility}%` : 'Not visible'}
                          </span>
                        </div>
                        <Progress value={visibility} className="h-1.5 bg-white/12 [&_[data-slot=progress-indicator]]:bg-eclipse" />
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
