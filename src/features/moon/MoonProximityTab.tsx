import { Camera } from 'lucide-react'
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
  return `${labels.moon} ${minutes}min ${moonBeforeSun ? 'before' : 'after'} ${labels.sun}`
}

function getQualityLabel(event: ProximityEvent): { text: string; className: string } {
  if (event.azimuthDiff <= 5 && event.timeDiffMinutes <= 10) {
    return { text: 'Excellent', className: 'text-emerald-400' }
  }
  if (event.azimuthDiff <= 10 && event.timeDiffMinutes <= 20) {
    return { text: 'Good', className: 'text-proximity' }
  }
  return { text: 'Fair', className: 'text-muted-foreground' }
}

export function MoonProximityTab({ events }: MoonProximityTabProps) {
  const { timeFormat } = useSettingsStore()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-proximity/8">
          <Camera className="h-3.5 w-3.5 text-proximity" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Photo Opportunities</span>
      </div>

      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground/60">
          No opportunities found in the next year
        </p>
      ) : (
        events.map((event, i) => {
          const quality = getQualityLabel(event)
          const labels = typeTimeLabels[event.type]

          return (
            <div
              key={i}
              className="surface-proximity p-5"
            >
                {/* Header: Date + Type */}
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    {formatDate(event.date)}
                  </h3>
                  <span className={`text-sm font-medium ${quality.className}`}>
                    {typeLabels[event.type]}
                  </span>
                </div>

                {/* Times row */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/[0.04] px-3 py-2.5">
                    <p className="text-xs text-muted-foreground/70">{labels.moon}</p>
                    <p className="text-lg font-semibold tabular-nums text-foreground">{formatTime(event.moonTime, timeFormat)}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.04] px-3 py-2.5">
                    <p className="text-xs text-muted-foreground/70">{labels.sun}</p>
                    <p className="text-lg font-semibold tabular-nums text-foreground">{formatTime(event.sunTime, timeFormat)}</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-3 flex items-center gap-3 text-sm tabular-nums text-foreground/70">
                  <span>{event.azimuthDiff.toFixed(1)}° apart</span>
                  <span className="text-white/10">|</span>
                  <span>{Math.round(event.timeDiffMinutes)} min gap</span>
                  <span className="text-white/10">|</span>
                  <span>{event.moonIllumination.toFixed(0)}% lit</span>
                </div>

                {/* Context line */}
                <p className="mt-2.5 text-sm text-muted-foreground/60">
                  {getTimingRelation(event)}
                  <span className="mx-1.5 text-white/10">·</span>
                  <span className={quality.className}>{quality.text}</span>
                </p>
            </div>
          )
        })
      )}
    </div>
  )
}
