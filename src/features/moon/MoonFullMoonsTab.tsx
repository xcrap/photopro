import { differenceInDays } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/formatting'
import { useCurrentTime } from '@/hooks/useCurrentTime'
import type { FullMoonEvent } from '@/types'

interface MoonFullMoonsTabProps {
  fullMoons: FullMoonEvent[]
}

export function MoonFullMoonsTab({ fullMoons }: MoonFullMoonsTabProps) {
  const now = useCurrentTime()

  function daysUntil(date: Date) {
    const days = differenceInDays(date, now)
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    return `in ${days} days`
  }

  return (
    <div className="space-y-3">
      {fullMoons.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No full moons found in range
        </p>
      ) : (
        fullMoons.map((fm, i) => (
          <Card
            key={i}
            className="transition-colors hover:bg-card/80"
            style={{ borderLeftWidth: 3, borderLeftColor: fm.isSupermoon ? 'var(--moon)' : 'transparent' }}
          >
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌕</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{fm.folkName}</p>
                    {fm.isSupermoon && (
                      <Badge className="bg-moon/10 text-moon text-xs">
                        Supermoon
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(fm.date)}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {daysUntil(fm.date)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
