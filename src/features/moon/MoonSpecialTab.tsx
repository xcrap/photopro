import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/formatting'
import type { SpecialEvent } from '@/types'

interface MoonSpecialTabProps {
  events: SpecialEvent[]
}

const typeBadgeColors: Record<SpecialEvent['type'], string> = {
  supermoon: 'bg-moon/12 text-moon border-0',
  'blue-moon': 'bg-blue-500/12 text-blue-300 border-0',
  'micro-moon': 'bg-zinc-500/12 text-zinc-300 border-0',
  'black-moon': 'bg-zinc-800/28 text-zinc-200 border-0',
}

export function MoonSpecialTab({ events }: MoonSpecialTabProps) {
  return (
    <div className="space-y-2">
      {events.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-muted-foreground/60">
          No special moon events found
        </p>
      ) : (
        events.map((event, i) => (
          <Card
            key={i}
            className="surface overflow-hidden border-0 transition-colors hover:bg-white/[0.06]"
          >
            <CardContent className="px-5 py-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-[20px] font-semibold tracking-tight text-foreground">{event.name}</p>
                    <p className="text-[15px] text-muted-foreground">{formatDate(event.date)}</p>
                  </div>
                  <Badge className={`px-2.5 py-0.5 text-[13px] capitalize ${typeBadgeColors[event.type]}`}>
                    {event.type.replace('-', ' ')}
                  </Badge>
                </div>
                <p className="text-[15px] leading-relaxed text-muted-foreground/90">{event.description}</p>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
