import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { useLocationStore } from '@/stores/location-store'
import { getUpcomingEclipses, getVisibilityForLocation } from '@/lib/astronomy/eclipse-calculator'
import { formatDate } from '@/lib/formatting'
import lunarEclipsesData from '@/data/lunar-eclipses.json'
import type { EclipseEvent } from '@/types'

interface MoonEclipsesTabProps {
  yearsRange: number
}

const typeBadgeColors: Record<string, string> = {
  total: 'bg-red-500/10 text-red-300 border-0',
  partial: 'bg-amber-500/10 text-amber-200 border-0',
  annular: 'bg-orange-500/10 text-orange-200 border-0',
  penumbral: 'bg-zinc-500/10 text-zinc-300 border-0',
}

export function MoonEclipsesTab({ yearsRange }: MoonEclipsesTabProps) {
  const { latitude, longitude } = useLocationStore()
  const [showAllEclipses, setShowAllEclipses] = useState(false)

  const eclipses = useMemo(() => {
    const data = lunarEclipsesData.map((e) => ({
      ...e,
      date: new Date(e.date),
      category: 'lunar' as const,
    })) as EclipseEvent[]
    return getUpcomingEclipses(data, [], yearsRange)
  }, [yearsRange])

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <span className="text-[12px] text-muted-foreground/80">
          {showAllEclipses ? 'Show all eclipses' : 'Visible from your location'}
        </span>
        <Switch checked={showAllEclipses} onCheckedChange={setShowAllEclipses} />
      </div>

      {filteredEclipses.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-muted-foreground/60">
          {showAllEclipses
            ? `No lunar eclipses in the next ${yearsRange} year${yearsRange > 1 ? 's' : ''}`
            : 'No visible lunar eclipses for your location in this range'}
        </p>
      ) : (
        filteredEclipses.map(({ eclipse, visibility }, i) => {
          return (
            <Card
              key={i}
              className="surface overflow-hidden border-0 transition-colors hover:bg-white/[0.06]"
            >
              <CardContent className="px-5 py-4">
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[21px] font-semibold tracking-tight capitalize text-foreground">
                        {eclipse.type} Lunar Eclipse
                      </p>
                      <p className="text-[15px] text-muted-foreground/90">
                        {formatDate(eclipse.date)} · Peak: {eclipse.peakTime}
                      </p>
                    </div>
                    <Badge className={`px-2.5 py-0.5 text-[13px] font-medium capitalize ${typeBadgeColors[eclipse.type] || ''}`}>
                      {eclipse.type}
                    </Badge>
                  </div>

                  <p className="text-[15px] leading-relaxed text-muted-foreground/90">{eclipse.description}</p>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg bg-white/[0.04] px-3 py-2.5 sm:col-span-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[12px] uppercase tracking-wide text-muted-foreground/70">Visibility here</p>
                        <p className="text-[17px] font-semibold tabular-nums text-foreground">
                          {visibility > 0 ? `${visibility}%` : 'Not visible'}
                        </p>
                      </div>
                      <Progress value={visibility} className="mt-2 h-1.5 bg-white/10" />
                    </div>

                    <div className="rounded-lg bg-white/[0.04] px-3 py-2.5">
                      <p className="text-[12px] uppercase tracking-wide text-muted-foreground/70">Duration</p>
                      <p className="text-[17px] font-semibold tabular-nums text-foreground">{eclipse.duration}</p>
                    </div>

                    <div className="rounded-lg bg-white/[0.04] px-3 py-2.5 sm:col-span-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[12px] uppercase tracking-wide text-muted-foreground/70">Magnitude</p>
                        <p className="text-[17px] font-semibold tabular-nums text-foreground">{eclipse.magnitude.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
