import { Sparkles } from 'lucide-react'
import { formatDate } from '@/lib/formatting'
import { useCurrentTime } from '@/hooks/useCurrentTime'
import { formatRelativeDays } from '@/lib/time/zone'
import type { SpecialEvent } from '@/types'

interface MoonSpecialTabProps {
  events: SpecialEvent[]
  timeZone: string
}

const typeColors: Record<SpecialEvent['type'], string> = {
  supermoon: 'text-moon',
  'blue-moon': 'text-blue-300',
  'micro-moon': 'text-zinc-400',
  'black-moon': 'text-zinc-300',
}

export function MoonSpecialTab({ events, timeZone }: MoonSpecialTabProps) {
  const now = useCurrentTime()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-moon/8">
          <Sparkles className="h-3.5 w-3.5 text-moon" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Special Events</span>
      </div>

      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No special moon events found
        </p>
      ) : (
        events.map((event) => (
          <div
            key={`${event.type}-${event.date.toISOString()}`}
            className="surface"
          >
              {/* Header: Date + Countdown */}
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {formatDate(event.date, timeZone)}
                </h3>
                <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                  {formatRelativeDays(event.date, now, timeZone)}
                </span>
              </div>

              {/* Event name */}
              <p className={`mt-1.5 text-sm font-semibold ${typeColors[event.type]}`}>
                {event.name}
              </p>

              <p className="mt-1.5 text-sm leading-relaxed text-foreground/50">{event.description}</p>
          </div>
        ))
      )}
    </div>
  )
}
