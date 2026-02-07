import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/formatting'
import type { SpecialEvent } from '@/types'

interface MoonSpecialTabProps {
  events: SpecialEvent[]
}

const typeEmojis: Record<SpecialEvent['type'], string> = {
  supermoon: '🌕',
  'blue-moon': '🔵',
  'micro-moon': '🔍',
  'black-moon': '⚫',
}

const typeBadgeColors: Record<SpecialEvent['type'], string> = {
  supermoon: 'bg-moon/10 text-moon',
  'blue-moon': 'bg-blue-500/10 text-blue-400',
  'micro-moon': 'bg-zinc-500/10 text-zinc-400',
  'black-moon': 'bg-zinc-800/30 text-zinc-300',
}

export function MoonSpecialTab({ events }: MoonSpecialTabProps) {
  return (
    <div className="space-y-3">
      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No special moon events found
        </p>
      ) : (
        events.map((event, i) => (
          <Card
            key={i}
            className="transition-colors hover:bg-card/80"
          >
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-xl">{typeEmojis[event.type]}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{event.name}</p>
                    <Badge className={`text-xs ${typeBadgeColors[event.type]}`}>
                      {event.type.replace('-', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
