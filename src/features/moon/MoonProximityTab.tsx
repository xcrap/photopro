import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime } from '@/lib/formatting'
import { useSettingsStore } from '@/stores/settings-store'
import type { ProximityEvent } from '@/types'

interface MoonProximityTabProps {
  events: ProximityEvent[]
}

const typeLabels: Record<ProximityEvent['type'], string> = {
  'moonrise-sunrise': 'Moonrise + Sunrise',
  'moonrise-sunset': 'Moonrise + Sunset',
  'moonset-sunrise': 'Moonset + Sunrise',
  'moonset-sunset': 'Moonset + Sunset',
}

const typeTimeLabels: Record<ProximityEvent['type'], { moon: 'Moonrise' | 'Moonset'; sun: 'Sunrise' | 'Sunset' }> = {
  'moonrise-sunrise': { moon: 'Moonrise', sun: 'Sunrise' },
  'moonrise-sunset': { moon: 'Moonrise', sun: 'Sunset' },
  'moonset-sunrise': { moon: 'Moonset', sun: 'Sunrise' },
  'moonset-sunset': { moon: 'Moonset', sun: 'Sunset' },
}

function getTimingRelation(event: ProximityEvent): string {
  const labels = typeTimeLabels[event.type]
  const moonBeforeSun = event.moonTime.getTime() <= event.sunTime.getTime()
  const minutes = Math.round(event.timeDiffMinutes)
  return `${labels.moon} is ${minutes} min ${moonBeforeSun ? 'before' : 'after'} ${labels.sun}.`
}

function getOpportunityNote(event: ProximityEvent): string {
  if (event.azimuthDiff <= 5 && event.timeDiffMinutes <= 10) {
    return 'Excellent alignment for wide landscape shots.'
  }
  if (event.azimuthDiff <= 10 && event.timeDiffMinutes <= 20) {
    return 'Good alignment with both bodies near the same horizon zone.'
  }
  return 'Usable alignment; composition will need careful framing.'
}

export function MoonProximityTab({ events }: MoonProximityTabProps) {
  const { timeFormat } = useSettingsStore()

  return (
    <div className="space-y-2">
      {events.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-muted-foreground/60">
          No opportunities found in the next year
        </p>
      ) : (
        events.map((event, i) => (
          <Card
            key={i}
            className="surface-proximity overflow-hidden border-0 transition-colors hover:bg-white/[0.06]"
          >
            <CardContent className="px-5 py-4">
              <div className="space-y-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[21px] font-semibold tracking-tight text-foreground">{formatDate(event.date)}</p>
                  <p className="text-[15px] font-medium text-proximity">{typeLabels[event.type]}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2.5">
                    <p className="text-[12px] uppercase tracking-wide text-muted-foreground/70">{typeTimeLabels[event.type].moon}</p>
                    <p className="text-[17px] font-semibold text-foreground">{formatTime(event.moonTime, timeFormat)}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2.5">
                    <p className="text-[12px] uppercase tracking-wide text-muted-foreground/70">{typeTimeLabels[event.type].sun}</p>
                    <p className="text-[17px] font-semibold text-foreground">{formatTime(event.sunTime, timeFormat)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-white/12 bg-white/[0.06] px-2.5 py-0.5 text-[13px] font-medium text-foreground/90">
                    Angle gap {event.azimuthDiff.toFixed(1)}°
                  </Badge>
                  <Badge variant="outline" className="border-white/12 bg-white/[0.06] px-2.5 py-0.5 text-[13px] font-medium text-foreground/90">
                    Time gap {Math.round(event.timeDiffMinutes)} min
                  </Badge>
                  <Badge variant="outline" className="border-white/12 bg-white/[0.06] px-2.5 py-0.5 text-[13px] font-medium text-foreground/90">
                    Moon light {event.moonIllumination.toFixed(0)}%
                  </Badge>
                </div>

                <div className="rounded-lg bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[12px] uppercase tracking-wide text-muted-foreground/70">
                    Solar context
                  </p>
                  <p className="text-[15px] font-medium text-foreground">
                    {typeTimeLabels[event.type].sun} window
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground/85">
                    {getTimingRelation(event)}
                  </p>
                </div>

                <p className="text-[14px] leading-relaxed text-muted-foreground">
                  Why it matters: {getOpportunityNote(event)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
