import { useMemo, useState } from 'react'
import { Eclipse } from 'lucide-react'
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

const typeColors: Record<string, string> = {
  total: 'text-red-300',
  partial: 'text-amber-200',
  annular: 'text-orange-200',
  penumbral: 'text-zinc-400',
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-eclipse/8">
            <Eclipse className="h-3.5 w-3.5 text-eclipse" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Lunar Eclipses</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground/80">
            {showAllEclipses ? 'All' : 'Visible only'}
          </span>
          <Switch checked={showAllEclipses} onCheckedChange={setShowAllEclipses} />
        </div>
      </div>

      {filteredEclipses.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {showAllEclipses
            ? `No lunar eclipses in the next ${yearsRange} year${yearsRange > 1 ? 's' : ''}`
            : 'No visible lunar eclipses for your location in this range'}
        </p>
      ) : (
        filteredEclipses.map(({ eclipse, visibility }, i) => (
          <div
            key={i}
            className="surface p-5"
          >
              {/* Header */}
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {formatDate(eclipse.date)}
                </h3>
                <span className={`text-xs font-semibold uppercase tracking-wider ${typeColors[eclipse.type] || 'text-foreground/60'}`}>
                  {eclipse.type}
                </span>
              </div>

              <p className="mt-1 text-sm text-foreground/60">
                <span className="capitalize">{eclipse.type}</span> Lunar Eclipse · Peak {eclipse.peakTime}
              </p>

              <p className="mt-2 text-sm leading-relaxed text-foreground/50">{eclipse.description}</p>

              {/* Visibility */}
              <div className="mt-3.5 flex items-center gap-4">
                <div className="flex-1">
                  <Progress value={visibility} className="h-1.5 bg-white/[0.06]" />
                </div>
                <span className="text-lg font-bold tabular-nums text-foreground">
                  {visibility > 0 ? `${visibility}%` : '—'}
                </span>
              </div>

              {/* Stats */}
              <div className="mt-2.5 flex items-center gap-3 text-sm tabular-nums text-foreground/50">
                <span>Duration {eclipse.duration}</span>
                <span className="text-white/10">|</span>
                <span>Magnitude {eclipse.magnitude.toFixed(2)}</span>
              </div>
          </div>
        ))
      )}
    </div>
  )
}
