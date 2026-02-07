import { Camera } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatDegrees, formatTime } from '@/lib/formatting'
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

export function MoonProximityTab({ events }: MoonProximityTabProps) {
  const { timeFormat } = useSettingsStore()

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-muted/30 p-3">
        <div className="flex items-start gap-2">
          <Camera className="mt-0.5 h-4 w-4 text-proximity" />
          <div>
            <p className="text-sm font-medium">Photo Opportunities</p>
            <p className="text-xs text-muted-foreground">
              Dates where the Moon and Sun are near the horizon at the same time and direction.
              Perfect for silhouette and landscape photography.
            </p>
          </div>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No proximity events found in the next year
        </p>
      ) : (
        events.map((event, i) => (
          <Card
            key={i}
            className="transition-colors hover:bg-card/80"
            style={{ borderLeftWidth: 3, borderLeftColor: 'var(--proximity)' }}
          >
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-xl">📸</span>
                  <div>
                    <p className="text-sm font-semibold">{typeLabels[event.type]}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {formatTime(event.moonTime, timeFormat)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {formatDegrees(event.azimuthDiff)} separation
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {event.moonIllumination.toFixed(0)}% moon
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
