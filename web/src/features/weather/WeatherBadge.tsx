import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { ScoredConditions } from '@/lib/weather/scoring'

interface WeatherBadgeProps {
  score: ScoredConditions | null
  className?: string
}

const BREAKDOWN_LABELS: Record<string, string> = {
  windScore: 'Wind',
  highCloudScore: 'High clouds',
  blockingCloudScore: 'Low/mid clear',
  clearSkyScore: 'Clear sky',
  humidityScore: 'Humidity',
  moonScore: 'Moon darkness',
}

function getBadgeClass(score: number): string {
  if (score >= 85) return 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
  if (score >= 70) return 'border-sky-300/20 bg-sky-300/10 text-sky-200'
  if (score >= 50) return 'border-amber-300/20 bg-amber-300/10 text-amber-200'
  return 'border-zinc-300/15 bg-zinc-300/8 text-zinc-300'
}

/**
 * Weather score chip. Tap (or click / Enter) opens the breakdown — a hover tooltip
 * never opened on touch screens.
 */
export function WeatherBadge({ score, className }: WeatherBadgeProps) {
  if (!score) return null

  const breakdown = Object.entries(score.breakdown).filter(
    (entry): entry is [string, number] => entry[1] !== undefined,
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Weather ${score.score} out of 100, ${score.label}. Show breakdown`}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'inline-flex min-h-8 items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold tabular-nums',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            getBadgeClass(score.score),
            className,
          )}
        >
          <span aria-hidden="true">{score.icon}</span>
          <span>{score.score}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent sideOffset={8} className="w-64 space-y-2 p-3">
        <div>
          <p className="text-sm font-semibold">
            {score.label} conditions · {score.score}/100
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {score.profile === 'sunset' ? 'Sunset profile' : 'Night profile'} · {score.summary}
          </p>
        </div>
        <dl className="space-y-1 text-xs">
          {breakdown.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{BREAKDOWN_LABELS[key] ?? key}</dt>
              <dd className="font-medium tabular-nums">{Math.round(value)}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  )
}
