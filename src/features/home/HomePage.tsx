import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun, Camera, Calendar, ArrowRight, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
      <SectionHeader
        title="Dashboard"
        description={formatDate(now)}
        icon={<Sparkles className="h-4 w-4" />}
      />

      {/* Sun Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sun className="h-4 w-4 text-sun" />
              Sun
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs text-muted-foreground">
              <Link to="/sun">
                Details <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-0 pt-0">
          <InfoRow
            label="Sunrise"
            value={formatTime(sunTimes.sunrise, timeFormat)}
            icon={<Sun className="h-3.5 w-3.5 text-amber-400" />}
          />
          <Separator className="opacity-30" />
          <InfoRow
            label="Sunset"
            value={formatTime(sunTimes.sunset, timeFormat)}
            icon={<Sun className="h-3.5 w-3.5 text-orange-400" />}
          />
          <Separator className="opacity-30" />
          <InfoRow
            label="Golden Hour"
            value={`${formatTime(sunTimes.goldenHourStart, timeFormat)} - ${formatTime(sunTimes.sunset, timeFormat)}`}
            icon={<Camera className="h-3.5 w-3.5 text-yellow-400" />}
          />
        </CardContent>
      </Card>

      {/* Moon Overview */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Moon className="h-4 w-4 text-moon" />
              Moon
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs text-muted-foreground">
              <Link to="/moon">
                Details <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center gap-5">
            <MoonPhaseIcon phase={moonData.phase} size={48} />
            <div className="flex-1 space-y-1">
              <div>
                <p className="font-semibold">{moonData.phaseName}</p>
                <p className="text-xs text-muted-foreground">
                  {moonData.illumination.toFixed(0)}% illuminated
                </p>
              </div>
            </div>
          </div>
          <Separator className="opacity-30" />
          <InfoRow
            label="Moonrise"
            value={moonData.moonrise ? formatTime(moonData.moonrise, timeFormat) : 'N/A'}
            icon={<Moon className="h-3.5 w-3.5 text-moon" />}
          />
          <Separator className="opacity-30" />
          <InfoRow
            label="Moonset"
            value={moonData.moonset ? formatTime(moonData.moonset, timeFormat) : 'N/A'}
            icon={<Moon className="h-3.5 w-3.5 text-muted-foreground" />}
          />
          {nextFullMoon && (
            <>
              <Separator className="opacity-30" />
              <InfoRow
                label="Next Full Moon"
                value={`${formatDateShort(nextFullMoon.date)} · ${nextFullMoon.folkName}`}
                icon={<Calendar className="h-3.5 w-3.5 text-moon" />}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4 text-primary" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {nextFullMoon && (
            <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
              <span className="text-xl">🌕</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{nextFullMoon.folkName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(nextFullMoon.date)}
                </p>
              </div>
              {nextFullMoon.isSupermoon && (
                <Badge className="bg-primary/10 text-primary">Supermoon</Badge>
              )}
            </div>
          )}

          {nextProximity && (
            <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
              <span className="text-xl">📸</span>
              <div className="flex-1">
                <p className="text-sm font-medium">Photo Opportunity</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateShort(nextProximity.date)} &middot; {nextProximity.description}
                </p>
              </div>
              <Badge variant="outline" className="border-proximity/30 text-proximity">
                {formatTime(nextProximity.moonTime, timeFormat)}
              </Badge>
            </div>
          )}

          {!nextFullMoon && !nextProximity && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No upcoming events found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
