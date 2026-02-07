import { differenceInDays } from 'date-fns'
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
    return `in ${days}d`
  }

  return fullMoons.length === 0 ? (
    <p className="py-8 text-center text-[13px] text-muted-foreground/70">
      No full moons found in range
    </p>
  ) : (
    <div className="surface divide-y divide-white/[0.04]">
      {fullMoons.map((fm, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-base">🌕</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[17px] font-semibold tracking-tight text-foreground">{fm.folkName}</p>
              {fm.isSupermoon && (
                <Badge className="shrink-0 border-0 bg-moon/10 px-1.5 py-0 text-[11px] font-medium text-moon">
                  Super
                </Badge>
              )}
            </div>
            <p className="text-[14px] text-muted-foreground">{formatDate(fm.date)}</p>
          </div>
          <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[13px] tabular-nums text-muted-foreground">
            {daysUntil(fm.date)}
          </span>
        </div>
      ))}
    </div>
  )
}
