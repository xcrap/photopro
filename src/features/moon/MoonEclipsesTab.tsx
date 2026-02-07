import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useLocationStore } from '@/stores/location-store'
import { getUpcomingEclipses, getVisibilityForLocation } from '@/lib/astronomy/eclipse-calculator'
import { formatDate } from '@/lib/formatting'
import lunarEclipsesData from '@/data/lunar-eclipses.json'
import type { EclipseEvent } from '@/types'

interface MoonEclipsesTabProps {
  yearsRange: number
}

const typeBadgeColors: Record<string, string> = {
  total: 'bg-red-500/10 text-red-400',
  partial: 'bg-amber-500/10 text-amber-400',
  annular: 'bg-orange-500/10 text-orange-400',
  penumbral: 'bg-zinc-500/10 text-zinc-400',
}

export function MoonEclipsesTab({ yearsRange }: MoonEclipsesTabProps) {
  const { latitude, longitude } = useLocationStore()

  const eclipses = useMemo(() => {
    const data = lunarEclipsesData.map((e) => ({
      ...e,
      date: new Date(e.date),
      category: 'lunar' as const,
    })) as EclipseEvent[]
    return getUpcomingEclipses(data, [], yearsRange)
  }, [yearsRange])

  return (
    <div className="space-y-3">
      {eclipses.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No lunar eclipses in the next {yearsRange} year{yearsRange > 1 ? 's' : ''}
        </p>
      ) : (
        eclipses.map((eclipse, i) => {
          const visibility = getVisibilityForLocation(eclipse, latitude, longitude)
          return (
            <Card
              key={i}
              className="transition-colors hover:bg-card/80"
              style={{ borderLeftWidth: 3, borderLeftColor: 'var(--eclipse)' }}
            >
              <CardContent className="py-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🌑</span>
                        <p className="text-sm font-semibold capitalize">
                          {eclipse.type} Lunar Eclipse
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(eclipse.date)} &middot; Peak: {eclipse.peakTime}
                      </p>
                    </div>
                    <Badge className={typeBadgeColors[eclipse.type] || ''}>
                      {eclipse.type}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">{eclipse.description}</p>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Visibility from your location</span>
                      <span className="font-medium">
                        {visibility > 0 ? `${visibility}%` : 'Not visible'}
                      </span>
                    </div>
                    <Progress
                      value={visibility}
                      className="h-1.5"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      Duration: {eclipse.duration}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Magnitude: {eclipse.magnitude.toFixed(2)}
                    </Badge>
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
